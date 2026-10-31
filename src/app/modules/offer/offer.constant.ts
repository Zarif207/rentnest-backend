export const OFFER_STATUSES = [
  "PENDING",
  "COUNTERED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "DEPOSIT_PAID",
  "COMPLETED",
  "EXPIRED",
] as const;

// Offers still in play: one buyer may hold only one of these per home, and
// they expire after OFFER_EXPIRY_DAYS without a new action.
export const OPEN_OFFER_STATUSES = [
  "PENDING",
  "COUNTERED",
  "ACCEPTED",
] as const;

export const OFFER_FINANCING = ["CASH", "MORTGAGE", "OTHER"] as const;

export const OFFER_ACTIONS = ["ACCEPT", "REJECT", "COUNTER"] as const;

export const offerSortableFields = [
  "createdAt",
  "updatedAt",
  "offerAmount",
] as const;

export const OFFER_EXPIRY_DAYS = 7;

// Earnest-money deposit: 1% of the agreed price, at least $500 (whole dollars).
export const DEPOSIT_RATE = 0.01;
export const MIN_DEPOSIT = 500;

export const depositFor = (agreedAmount: number) =>
  Math.max(MIN_DEPOSIT, Math.round(agreedAmount * DEPOSIT_RATE));

// Dashboard pages the notifications link to.
export const BUYER_OFFERS_PATH = "/dashboard/tenant/offers";
export const OWNER_OFFERS_PATH = "/dashboard/landlord/offers";
