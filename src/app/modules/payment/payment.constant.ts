export const PAYMENT_METHOD = {
  CARD: "CARD",
} as const;

export const PAYMENT_PROVIDER = {
  STRIPE: "STRIPE",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
} as const;
