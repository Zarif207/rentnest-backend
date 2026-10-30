import httpStatus from "http-status";
import Stripe from "stripe";
import prisma from "../../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import stripe from "../../../config/stripe.js";
import config from "../../../config/index.js";
import { NotificationServices } from "../notification/notification.service.js";

const paymentInclude = {
  booking: {
    include: {
      property: true,
    },
  },
} as const;

// Stripe replaces {CHECKOUT_SESSION_ID} in the success URL with the session id.
const buildSuccessUrl = () => {
  const url = config.client_success_url;
  if (url.includes("{CHECKOUT_SESSION_ID}")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
};

const createStripeSession = (booking: {
  id: string;
  tenantId: string;
  totalRent: unknown;
  property: { title: string };
}) => {
  const amount = Number(booking.totalRent);

  return stripe.checkout.sessions.create({
    mode: "payment",
    // Card only, matching the CARD payment method stored on the Payment row.
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `RentNest - ${booking.property.title}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookingId: booking.id,
      tenantId: booking.tenantId,
    },
    success_url: buildSuccessUrl(),
    cancel_url: config.client_cancel_url,
  });
};

/** Tells the tenant their payment went through and the landlord they were paid. */
const notifyPaymentPaid = async (bookingId: string) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        tenantId: true,
        totalRent: true,
        property: { select: { title: true, ownerId: true } },
        tenant: { select: { name: true } },
      },
    });
    if (!booking) return;

    const amount = `$${Number(booking.totalRent).toLocaleString("en-US")}`;

    await NotificationServices.notify(booking.tenantId, {
      type: "PAYMENT_SUCCESS",
      title: "Payment successful",
      message: `Your payment of ${amount} for ${booking.property.title} went through. Your rental is now active.`,
      link: "/dashboard/tenant/payments",
    });
    await NotificationServices.notify(booking.property.ownerId, {
      type: "PAYMENT_RECEIVED",
      title: "Payment received",
      message: `${booking.tenant.name} paid ${amount} for ${booking.property.title}.`,
      link: "/dashboard/landlord/requests",
    });
  } catch (error) {
    console.error("Failed to send payment notifications", error);
  }
};

/**
 * Marks a paid Checkout Session as PAID and activates the rental.
 * Shared by the webhook and POST /payments/confirm. The conditional
 * updateMany calls make it idempotent: whichever caller runs first does the
 * work, and any later or concurrent call updates zero rows and changes nothing.
 */
const markSessionPaid = async (session: Stripe.Checkout.Session) => {
  if (session.payment_status !== "paid") {
    return { processed: false };
  }

  const payment = await prisma.payment.findUnique({
    where: { transactionId: session.id },
    include: { booking: true },
  });

  // Not one of our sessions (or superseded by a retry): nothing to update.
  if (!payment || payment.bookingId !== session.metadata?.bookingId) {
    return { processed: false };
  }

  const processed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: {
        id: payment.id,
        transactionId: session.id,
        paymentStatus: { not: "PAID" },
      },
      data: {
        paymentStatus: "PAID",
        paymentDate: new Date(),
      },
    });

    if (count === 0) {
      return false;
    }

    const activated = await tx.booking.updateMany({
      where: { id: payment.bookingId, bookingStatus: "APPROVED" },
      data: { bookingStatus: "ACTIVE" },
    });

    if (activated.count > 0) {
      await tx.property.update({
        where: { id: payment.booking.propertyId },
        data: { availabilityStatus: "RENTED" },
      });
    }

    return true;
  });

  // Only the call that actually processed the payment notifies, so the
  // webhook and /payments/confirm never send duplicates.
  if (processed) {
    await notifyPaymentPaid(payment.bookingId);
  }

  return { processed };
};

// Expired or failed sessions mark a still-pending payment FAILED so the tenant can retry.
const markSessionFailed = async (session: Stripe.Checkout.Session) => {
  const { count } = await prisma.payment.updateMany({
    where: {
      transactionId: session.id,
      paymentStatus: "PENDING",
    },
    data: {
      paymentStatus: "FAILED",
    },
  });

  return { processed: count > 0 };
};

const createStripeCheckoutSession = async (
  tenantId: string,
  bookingId: string,
) => {
  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      payment: true,
      property: true,
    },
  });

  if (!booking || booking.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Rental booking not found");
  }

  if (booking.tenantId !== tenantId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to pay for this booking",
    );
  }

  if (booking.payment?.paymentStatus === "PAID") {
    throw new AppError(
      httpStatus.CONFLICT,
      "This rental has already been paid",
    );
  }

  if (booking.bookingStatus !== "APPROVED") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment can only be made for an approved rental",
    );
  }

  // Retry: reuse a still-open session, otherwise replace it with a new one.
  if (booking.payment) {
    const existing = await stripe.checkout.sessions.retrieve(
      booking.payment.transactionId,
    );

    if (existing.payment_status === "paid") {
      await markSessionPaid(existing);
      throw new AppError(
        httpStatus.CONFLICT,
        "This rental has already been paid",
      );
    }

    if (
      existing.status === "open" &&
      booking.payment.paymentStatus === "PENDING"
    ) {
      return {
        sessionId: existing.id,
        checkoutUrl: existing.url,
        paymentId: booking.payment.id,
      };
    }
  }

  const session = await createStripeSession(booking);
  const amount = Number(booking.totalRent);

  const payment = await prisma.payment.upsert({
    where: { bookingId: booking.id },
    update: {
      transactionId: session.id,
      amount,
      paymentStatus: "PENDING",
      paymentDate: null,
    },
    create: {
      bookingId: booking.id,
      transactionId: session.id,
      amount,
      paymentMethod: "CARD",
      provider: "STRIPE",
      paymentStatus: "PENDING",
    },
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    paymentId: payment.id,
  };
};

const confirmPayment = async (tenantId: string, sessionId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId: sessionId },
    include: { booking: true },
  });

  if (!payment) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "No payment found for this checkout session",
    );
  }

  if (payment.booking.tenantId !== tenantId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to confirm this payment",
    );
  }

  if (payment.paymentStatus !== "PAID") {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      await markSessionPaid(session);
    } else if (session.status === "expired") {
      await markSessionFailed(session);
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This checkout session has expired; create a new payment to try again",
      );
    } else {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Payment has not been completed yet",
      );
    }
  }

  return prisma.payment.findUniqueOrThrow({
    where: { id: payment.id },
    include: paymentInclude,
  });
};

const handleStripeWebhook = async (payload: Buffer, signature: string) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe_webhook_secret,
    );
  } catch {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid Stripe webhook signature",
    );
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return markSessionPaid(event.data.object);

    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      return markSessionFailed(event.data.object);

    default:
      return { processed: false };
  }
};

const getMyPayments = async (tenantId: string) => {
  const payments = await prisma.payment.findMany({
    where: {
      booking: {
        tenantId,
        isDeleted: false,
      },
    },
    include: paymentInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return payments;
};

const getPaymentById = async (paymentId: string, tenantId: string) => {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: paymentInclude,
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  if (payment.booking.tenantId !== tenantId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to view this payment",
    );
  }

  return payment;
};

export const PaymentServices = {
  createStripeCheckoutSession,
  confirmPayment,
  handleStripeWebhook,
  getMyPayments,
  getPaymentById,
};
