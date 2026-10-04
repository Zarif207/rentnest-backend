import { z } from "zod";



const createStripeCheckoutSessionSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
});

export const PaymentValidation = {
  createStripeCheckoutSessionSchema,
};