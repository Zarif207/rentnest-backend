import { z } from "zod";

const createRentalRequestSchema = z.object({
  propertyId: z.string().uuid("Invalid property ID"),
  moveInDate: z.string().datetime("Invalid move-in date"),
  leaseMonths: z
    .number()
    .int()
    .positive("Lease months must be greater than 0"),
});

export const RentalValidation = {
  createRentalRequestSchema,
};