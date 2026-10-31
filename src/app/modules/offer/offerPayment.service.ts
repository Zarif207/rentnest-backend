import httpStatus from "http-status";
import Stripe from "stripe";
import prisma from "../../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import stripe from "../../../config/stripe.js";
import config from "../../../config/index.js";
import { NotificationServices } from "../notification/notification.service.js";
import {
  BUYER_OFFERS_PATH,
  depositFor,
  OPEN_OFFER_STATUSES,
  OWNER_OFFERS_PATH,
} from "./offer.constant.js";
import { offerInclude, OfferServices, withDeposit } from "./offer.service.js";

// Set on every deposit Checkout Session; the Stripe webhook routes on it.
export const SALE_DEPOSIT_TYPE = "sale_deposit";

export const isDepositSession = (session: Stripe.Checkout.Session) =>
  session.metadata?.type === SALE_DEPOSIT_TYPE;

const money = (amount: number) => `$${amount.toLocaleString("en-US")}`;

/** The client's success/cancel page with our own query (any existing one is replaced). */
const withQuery = (url: string, query: string) =>
  `${url.split("?")[0]}?${query}`;

const createDepositSession = (offer: {
  id: string;
  buyerId: string;
  property: { title: string };
  depositAmount: number;
}) =>
  stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `RentNest deposit - ${offer.property.title}`,
          },
          unit_amount: offer.depositAmount * 100,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: SALE_DEPOSIT_TYPE,
      offerId: offer.id,
      buyerId: offer.buyerId,
    },
    // Stripe fills in {CHECKOUT_SESSION_ID}; it must stay unencoded.
    success_url: withQuery(
      config.client_success_url,
      "type=deposit&session_id={CHECKOUT_SESSION_ID}",
    ),
    cancel_url: withQuery(
      config.client_cancel_url,
      `type=deposit&offerId=${offer.id}`,
    ),
  });

/** Tells the buyer the deposit went through and the owner they received it. */
const notifyDepositPaid = async (
  offerId: string,
  rejectedBuyerIds: string[],
) => {
  try {
    const offer = await prisma.purchaseOffer.findUnique({
      where: { id: offerId },
      include: offerInclude,
    });
    if (!offer?.payment) return;

    const amount = money(Number(offer.payment.amount));
    const { title, ownerId } = offer.property;

    await NotificationServices.notify(offer.buyerId, {
      type: "DEPOSIT_PAID",
      title: "Deposit received",
      message: `Your ${amount} deposit for ${title} went through. The home is now under contract.`,
      link: BUYER_OFFERS_PATH,
    });
    await NotificationServices.notify(ownerId, {
      type: "DEPOSIT_RECEIVED",
      title: "Deposit received",
      message: `${offer.buyer.name} paid the ${amount} deposit for ${title}. The home is now under contract.`,
      link: OWNER_OFFERS_PATH,
    });
    await NotificationServices.notify(rejectedBuyerIds, {
      type: "OFFER_REJECTED",
      title: "Home under contract",
      message: `${title} went under contract with another buyer, so your offer was closed.`,
      link: BUYER_OFFERS_PATH,
    });
  } catch (error) {
    console.error("Failed to send deposit notifications", error);
  }
};

/**
 * Marks a paid deposit session PAID, the offer DEPOSIT_PAID and the home
 * UNDER_CONTRACT, and closes every other open offer on it. Shared by the
 * webhook and POST /offers/confirm; the conditional updates make it
 * idempotent, so only the first caller notifies.
 */
const markDepositPaid = async (session: Stripe.Checkout.Session) => {
  if (session.payment_status !== "paid") {
    return { processed: false };
  }

  const payment = await prisma.offerPayment.findUnique({
    where: { transactionId: session.id },
    include: { offer: true },
  });
  if (!payment || payment.offerId !== session.metadata?.offerId) {
    return { processed: false };
  }

  const result = await prisma.$transaction(async (tx) => {
    const { count } = await tx.offerPayment.updateMany({
      where: {
        id: payment.id,
        transactionId: session.id,
        paymentStatus: { not: "PAID" },
      },
      data: { paymentStatus: "PAID", paymentDate: new Date() },
    });
    if (count === 0) return null;

    // EXPIRED too: a buyer who paid right as the offer timed out still paid.
    const contracted = await tx.purchaseOffer.updateMany({
      where: { id: payment.offerId, status: { in: ["ACCEPTED", "EXPIRED"] } },
      data: { status: "DEPOSIT_PAID" },
    });
    if (contracted.count === 0) return { rejectedBuyerIds: [] };

    await tx.property.update({
      where: { id: payment.offer.propertyId },
      data: { availabilityStatus: "UNDER_CONTRACT" },
    });

    const others = await tx.purchaseOffer.findMany({
      where: {
        propertyId: payment.offer.propertyId,
        id: { not: payment.offerId },
        status: { in: [...OPEN_OFFER_STATUSES] },
      },
      select: { id: true, buyerId: true },
    });
    await tx.purchaseOffer.updateMany({
      where: { id: { in: others.map((offer) => offer.id) } },
      data: { status: "REJECTED" },
    });
    return { rejectedBuyerIds: others.map((offer) => offer.buyerId) };
  });

  if (result) {
    await notifyDepositPaid(payment.offerId, result.rejectedBuyerIds);
  }
  return { processed: result !== null };
};

// An expired or failed session marks a still-pending deposit FAILED, so the buyer can retry.
const markDepositFailed = async (session: Stripe.Checkout.Session) => {
  const { count } = await prisma.offerPayment.updateMany({
    where: { transactionId: session.id, paymentStatus: "PENDING" },
    data: { paymentStatus: "FAILED" },
  });
  return { processed: count > 0 };
};

/** POST /offers/:id/deposit: a Checkout Session for an accepted offer's deposit. */
const createDepositCheckout = async (offerId: string, buyerId: string) => {
  await OfferServices.expireStaleOffers({ id: offerId });
  const offer = await prisma.purchaseOffer.findUnique({
    where: { id: offerId },
    include: offerInclude,
  });

  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, "Offer not found");
  }
  if (offer.buyerId !== buyerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to pay for this offer",
    );
  }
  if (
    offer.status === "DEPOSIT_PAID" ||
    offer.payment?.paymentStatus === "PAID"
  ) {
    throw new AppError(httpStatus.CONFLICT, "The deposit is already paid");
  }
  if (offer.status !== "ACCEPTED" || offer.agreedAmount === null) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "A deposit can only be paid on an accepted offer",
    );
  }
  if (offer.property.availabilityStatus !== "AVAILABLE") {
    throw new AppError(httpStatus.CONFLICT, "This home is no longer available");
  }

  const depositAmount = depositFor(Number(offer.agreedAmount));

  // Retry: reuse a still-open session, otherwise replace it with a new one.
  if (offer.payment) {
    const existing = await stripe.checkout.sessions.retrieve(
      offer.payment.transactionId,
    );
    if (existing.payment_status === "paid") {
      await markDepositPaid(existing);
      throw new AppError(httpStatus.CONFLICT, "The deposit is already paid");
    }
    if (
      existing.status === "open" &&
      offer.payment.paymentStatus === "PENDING"
    ) {
      return {
        sessionId: existing.id,
        checkoutUrl: existing.url,
        depositAmount,
        offerPaymentId: offer.payment.id,
      };
    }
  }

  const session = await createDepositSession({ ...offer, depositAmount });
  const payment = await prisma.offerPayment.upsert({
    where: { offerId: offer.id },
    update: {
      transactionId: session.id,
      amount: depositAmount,
      paymentStatus: "PENDING",
      paymentDate: null,
    },
    create: {
      offerId: offer.id,
      transactionId: session.id,
      amount: depositAmount,
    },
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    depositAmount,
    offerPaymentId: payment.id,
  };
};

/** POST /offers/confirm: called from the success page; safe to repeat. */
const confirmDeposit = async (buyerId: string, sessionId: string) => {
  const payment = await prisma.offerPayment.findUnique({
    where: { transactionId: sessionId },
    include: { offer: true },
  });

  if (!payment) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "No deposit found for this checkout session",
    );
  }
  if (payment.offer.buyerId !== buyerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to confirm this deposit",
    );
  }

  if (payment.paymentStatus !== "PAID") {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      await markDepositPaid(session);
    } else if (session.status === "expired") {
      await markDepositFailed(session);
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This checkout session has expired; start the deposit again to retry",
      );
    } else {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "The deposit has not been paid yet",
      );
    }
  }

  return withDeposit(
    await prisma.purchaseOffer.findUniqueOrThrow({
      where: { id: payment.offerId },
      include: offerInclude,
    }),
  );
};

/** GET /offers/payments: the buyer's deposits, newest first. */
const getMyDeposits = async (buyerId: string) =>
  prisma.offerPayment.findMany({
    where: { offer: { buyerId } },
    include: {
      offer: {
        include: {
          property: offerInclude.property,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

export const OfferPaymentServices = {
  createDepositCheckout,
  confirmDeposit,
  getMyDeposits,
  markDepositPaid,
  markDepositFailed,
};
