export const PAYMENT_METHOD = {
  STRIPE: "STRIPE",
  CASH: "CASH",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
} as const;