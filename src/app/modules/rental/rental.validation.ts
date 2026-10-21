import { z } from "zod";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { BOOKING_STATUSES, rentalSortableFields } from "./rental.constant.js";

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

const completeRentalValidationSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid rental ID"),
  }),
});

const rentalStatusQuerySchema = z.object({
  query: z.object({
    status: z.enum(BOOKING_STATUSES).optional(),
  }),
});

const adminRentalQuerySchema = z.object({
  query: z.object({
    status: z.enum(BOOKING_STATUSES).optional(),
    ...paginationHelper.paginationQueryFields(rentalSortableFields),
  }),
});

export const RentalValidation = {
  createRentalRequestSchema,
  rentalStatusQuerySchema,
  adminRentalQuerySchema,
  rentalIdValidationSchema,
  updateRentalStatusSchema,
  completeRentalValidationSchema,
};
