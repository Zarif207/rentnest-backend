import { z } from "zod";

const createStripeCheckoutSessionSchema = z.object({
  body: z.object({
    bookingId: z.string().uuid("Invalid booking ID"),
  }),
});

const confirmPaymentSchema = z.object({
  body: z.object({
    sessionId: z
      .string()
      .regex(/^cs_(test|live)_[A-Za-z0-9]+$/, "Invalid Stripe checkout session ID"),
  }),
});

const paymentIdValidationSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid payment ID"),
  }),
});

export const PaymentValidation = {
  createStripeCheckoutSessionSchema,
  confirmPaymentSchema,
  paymentIdValidationSchema,
};