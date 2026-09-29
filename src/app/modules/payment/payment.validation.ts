import { z } from "zod";

const createPaymentSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),

  transactionId: z
    .string()
    .min(1, "Transaction ID is required"),

  amount: z
    .number()
    .positive("Amount must be greater than 0"),

  paymentMethod: z.enum(["STRIPE", "CASH"]),
});

const createStripeCheckoutSessionSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
});

export const PaymentValidation = {
  createPaymentSchema,
  createStripeCheckoutSessionSchema,
};