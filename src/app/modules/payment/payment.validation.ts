import { z } from "zod";

const createStripeCheckoutSessionSchema = z.object({
  body: z.object({
    bookingId: z.string().uuid("Invalid booking ID"),
  }),
});

const paymentIdValidationSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid payment ID"),
  }),
});

export const PaymentValidation = {
  createStripeCheckoutSessionSchema,
  paymentIdValidationSchema,
};