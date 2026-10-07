import { z } from "zod";

const createRentalRequestSchema = z.object({
  body: z.object({
    propertyId: z.string().uuid("Invalid property ID"),
    moveInDate: z.string().datetime("Invalid move-in date"),
    leaseMonths: z
      .number()
      .int()
      .positive("Lease months must be greater than 0"),
  }),
});

const rentalIdValidationSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid rental ID"),
  }),
});

const updateRentalStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid rental ID"),
  }),
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
  }),
});

export const RentalValidation = {
  createRentalRequestSchema,
  rentalIdValidationSchema,
  updateRentalStatusSchema,
};
