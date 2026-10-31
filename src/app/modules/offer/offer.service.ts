import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { TPaginationOptions } from "../../interfaces/pagination.js";
import { NotificationServices } from "../notification/notification.service.js";
import {
  BUYER_OFFERS_PATH,
  depositFor,
  OFFER_EXPIRY_DAYS,
  OPEN_OFFER_STATUSES,
  OWNER_OFFERS_PATH,
} from "./offer.constant.js";
import {
  TCreateOffer,
  TOfferFilters,
  TOfferStatus,
  TRespondToOffer,
} from "./offer.interface.js";

// Every offer response carries the home, the buyer and the deposit payment.
export const offerInclude = {
  property: {
    select: {
      id: true,
      title: true,
      city: true,
      division: true,
      images: true,
      salePrice: true,
      availabilityStatus: true,
      ownerId: true,
    },
  },
  buyer: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
  payment: true,
} as const;

type TOfferWithRelations = Prisma.PurchaseOfferGetPayload<{
  include: typeof offerInclude;
}>;

const money = (amount: Prisma.Decimal | number) =>
  `$${Number(amount).toLocaleString("en-US")}`;

/** Adds `depositAmount` once a price is agreed (null before). */
export const withDeposit = <T extends { agreedAmount: Prisma.Decimal | null }>(
  offer: T,
) => ({
  ...offer,
  depositAmount:
    offer.agreedAmount === null ? null : depositFor(Number(offer.agreedAmount)),
});

/**
 * Expires open offers (PENDING, COUNTERED, ACCEPTED without a paid deposit)
 * that have had no action for OFFER_EXPIRY_DAYS. Runs lazily before offers
 * are read or acted on, and from `npm run offers:expire`.
 */
const expireStaleOffers = async (
  where: Prisma.PurchaseOfferWhereInput = {},
) => {
  const cutoff = new Date(Date.now() - OFFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.purchaseOffer.updateMany({
    where: {
      ...where,
      status: { in: [...OPEN_OFFER_STATUSES] },
      updatedAt: { lt: cutoff },
    },
    data: { status: "EXPIRED" },
  });
  return count;
};

/** Loads an offer (after expiring it if it's stale) or throws 404. */
const findOffer = async (id: string) => {
  await expireStaleOffers({ id });
  const offer = await prisma.purchaseOffer.findUnique({
    where: { id },
    include: offerInclude,
  });
  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, "Offer not found");
  }
  return offer;
};

/**
 * Moves an offer from `from` to new data in one conditional update, so two
 * requests racing on the same offer can't both win.
 */
const transition = async (
  offer: TOfferWithRelations,
  from: TOfferStatus[],
  data: Prisma.PurchaseOfferUpdateManyMutationInput,
) => {
  const { count } = await prisma.purchaseOffer.updateMany({
    where: { id: offer.id, status: { in: from } },
    data,
  });
  if (count === 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This offer was just updated. Refresh and try again.",
    );
  }
  return withDeposit(
    await prisma.purchaseOffer.findUniqueOrThrow({
      where: { id: offer.id },
      include: offerInclude,
    }),
  );
};

/** One accepted (or under-contract) offer per home at a time. */
const ensureNoOtherAcceptedOffer = async (offer: TOfferWithRelations) => {
  const other = await prisma.purchaseOffer.findFirst({
    where: {
      propertyId: offer.propertyId,
      id: { not: offer.id },
      status: { in: ["ACCEPTED", "DEPOSIT_PAID"] },
    },
    select: { id: true },
  });
  if (other) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Another offer on this home is already accepted",
    );
  }
};

const ensureStillForSale = (offer: TOfferWithRelations) => {
  if (offer.property.availabilityStatus !== "AVAILABLE") {
    throw new AppError(httpStatus.CONFLICT, "This home is no longer available");
  }
};

const createOffer = async (buyerId: string, payload: TCreateOffer) => {
  const property = await prisma.property.findUnique({
    where: { id: payload.propertyId },
    select: {
      id: true,
      title: true,
      ownerId: true,
      listingType: true,
      availabilityStatus: true,
    },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }
  if (property.listingType !== "SALE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This home is for rent. Send a rental request instead.",
    );
  }
  if (property.availabilityStatus !== "AVAILABLE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This home is not accepting offers",
    );
  }
  if (property.ownerId === buyerId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You can't make an offer on your own home",
    );
  }

  await expireStaleOffers({ propertyId: property.id, buyerId });
  const open = await prisma.purchaseOffer.findFirst({
    where: {
      propertyId: property.id,
      buyerId,
      status: { in: [...OPEN_OFFER_STATUSES] },
    },
    select: { id: true },
  });
  if (open) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You already have an open offer on this home",
    );
  }

  const offer = await prisma.purchaseOffer.create({
    data: {
      propertyId: property.id,
      buyerId,
      offerAmount: payload.offerAmount,
      financing: payload.financing,
      message: payload.message ?? null,
    },
    include: offerInclude,
  });

  await NotificationServices.notify(property.ownerId, {
    type: "OFFER_RECEIVED",
    title: "New offer",
    message: `${offer.buyer.name} offered ${money(offer.offerAmount)} for ${property.title}.`,
    link: OWNER_OFFERS_PATH,
  });

  return withDeposit(offer);
};

const getMyOffers = async (buyerId: string, filters: TOfferFilters) => {
  await expireStaleOffers({ buyerId });
  const offers = await prisma.purchaseOffer.findMany({
    where: {
      buyerId,
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: offerInclude,
    orderBy: { createdAt: "desc" },
  });
  return offers.map(withDeposit);
};

/** The buyer, the home's owner and admins can open an offer. */
const getOfferById = async (id: string, userId: string, role: string) => {
  const offer = await findOffer(id);
  if (
    role !== "ADMIN" &&
    offer.buyerId !== userId &&
    offer.property.ownerId !== userId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to view this offer",
    );
  }
  return withDeposit(offer);
};

const findBuyerOffer = async (id: string, buyerId: string) => {
  const offer = await findOffer(id);
  if (offer.buyerId !== buyerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to change this offer",
    );
  }
  return offer;
};

const withdrawOffer = async (id: string, buyerId: string) => {
  const offer = await findBuyerOffer(id, buyerId);

  // Deposits aren't refunded automatically, so a paid offer goes through the owner.
  if (offer.status === "DEPOSIT_PAID") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Your deposit is paid, so this offer can't be withdrawn here. Contact the owner.",
    );
  }
  if (!(OPEN_OFFER_STATUSES as readonly string[]).includes(offer.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only open offers can be withdrawn",
    );
  }

  const result = await transition(offer, [...OPEN_OFFER_STATUSES], {
    status: "WITHDRAWN",
  });

  await NotificationServices.notify(offer.property.ownerId, {
    type: "OFFER_WITHDRAWN",
    title: "Offer withdrawn",
    message: `${offer.buyer.name} withdrew their ${money(offer.offerAmount)} offer on ${offer.property.title}.`,
    link: OWNER_OFFERS_PATH,
  });

  return result;
};

const acceptCounter = async (id: string, buyerId: string) => {
  const offer = await findBuyerOffer(id, buyerId);

  if (offer.status !== "COUNTERED" || offer.counterAmount === null) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only a countered offer can be accepted",
    );
  }
  ensureStillForSale(offer);
  await ensureNoOtherAcceptedOffer(offer);

  const result = await transition(offer, ["COUNTERED"], {
    status: "ACCEPTED",
    agreedAmount: offer.counterAmount,
  });

  await NotificationServices.notify(offer.property.ownerId, {
    type: "OFFER_ACCEPTED",
    title: "Counteroffer accepted",
    message: `${offer.buyer.name} accepted your ${money(offer.counterAmount)} counteroffer on ${offer.property.title}. They'll pay the deposit next.`,
    link: OWNER_OFFERS_PATH,
  });

  return result;
};

const getLandlordOffers = async (ownerId: string, filters: TOfferFilters) => {
  await expireStaleOffers({ property: { ownerId } });
  const offers = await prisma.purchaseOffer.findMany({
    where: {
      property: { ownerId },
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: offerInclude,
    orderBy: { createdAt: "desc" },
  });
  return offers.map(withDeposit);
};

const findOwnerOffer = async (id: string, ownerId: string) => {
  const offer = await findOffer(id);
  if (offer.property.ownerId !== ownerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to respond to this offer",
    );
  }
  return offer;
};

/**
 * The owner's answer. ACCEPT and COUNTER work on a PENDING offer; REJECT also
 * ends a COUNTERED offer or an ACCEPTED one whose deposit hasn't been paid.
 */
const respondToOffer = async (
  id: string,
  ownerId: string,
  payload: TRespondToOffer,
) => {
  const offer = await findOwnerOffer(id, ownerId);
  const { title } = offer.property;

  if (payload.action === "REJECT") {
    if (!(OPEN_OFFER_STATUSES as readonly string[]).includes(offer.status)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Only open offers can be rejected",
      );
    }
    const result = await transition(offer, [...OPEN_OFFER_STATUSES], {
      status: "REJECTED",
    });
    await NotificationServices.notify(offer.buyerId, {
      type: "OFFER_REJECTED",
      title: "Offer declined",
      message: `The owner declined your ${money(offer.offerAmount)} offer on ${title}.`,
      link: BUYER_OFFERS_PATH,
    });
    return result;
  }

  if (offer.status !== "PENDING") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only pending offers can be accepted or countered",
    );
  }
  ensureStillForSale(offer);

  if (payload.action === "ACCEPT") {
    await ensureNoOtherAcceptedOffer(offer);
    const result = await transition(offer, ["PENDING"], {
      status: "ACCEPTED",
      agreedAmount: offer.offerAmount,
    });
    await NotificationServices.notify(offer.buyerId, {
      type: "OFFER_ACCEPTED",
      title: "Offer accepted",
      message: `The owner accepted your ${money(offer.offerAmount)} offer on ${title}. Pay the ${money(result.depositAmount ?? 0)} deposit to put the home under contract.`,
      link: BUYER_OFFERS_PATH,
    });
    return result;
  }

  // COUNTER (validation guarantees the amount)
  const counterAmount = payload.counterAmount as number;
  const result = await transition(offer, ["PENDING"], {
    status: "COUNTERED",
    counterAmount,
  });
  await NotificationServices.notify(offer.buyerId, {
    type: "OFFER_COUNTERED",
    title: "Counteroffer received",
    message: `The owner countered your offer on ${title} with ${money(counterAmount)}.`,
    link: BUYER_OFFERS_PATH,
  });
  return result;
};

/** After the deposit: the owner closes the sale and the home is SOLD. */
const completeSale = async (id: string, ownerId: string) => {
  const offer = await findOwnerOffer(id, ownerId);

  if (offer.status !== "DEPOSIT_PAID") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "A sale can only be completed after the deposit is paid",
    );
  }

  const completed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.purchaseOffer.updateMany({
      where: { id: offer.id, status: "DEPOSIT_PAID" },
      data: { status: "COMPLETED" },
    });
    if (count === 0) return false;
    await tx.property.update({
      where: { id: offer.propertyId },
      data: { availabilityStatus: "SOLD" },
    });
    return true;
  });

  if (!completed) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This offer was just updated. Refresh and try again.",
    );
  }

  await NotificationServices.notify(offer.buyerId, {
    type: "SALE_COMPLETED",
    title: "Sale completed",
    message: `The sale of ${offer.property.title} is complete. Congratulations on your new home!`,
    link: BUYER_OFFERS_PATH,
  });

  return withDeposit(
    await prisma.purchaseOffer.findUniqueOrThrow({
      where: { id: offer.id },
      include: offerInclude,
    }),
  );
};

const getAllOffersForAdmin = async (
  filters: TOfferFilters,
  options: TPaginationOptions,
) => {
  await expireStaleOffers();
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const where: Prisma.PurchaseOfferWhereInput = filters.status
    ? { status: filters.status }
    : {};

  const [data, total] = await Promise.all([
    prisma.purchaseOffer.findMany({
      where,
      include: offerInclude,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.purchaseOffer.count({ where }),
  ]);

  return {
    meta: paginationHelper.buildMeta(page, limit, total),
    data: data.map(withDeposit),
  };
};

export const OfferServices = {
  expireStaleOffers,
  createOffer,
  getMyOffers,
  getOfferById,
  withdrawOffer,
  acceptCounter,
  getLandlordOffers,
  respondToOffer,
  completeSale,
  getAllOffersForAdmin,
};
