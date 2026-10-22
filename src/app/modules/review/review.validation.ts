import { z } from "zod";
import { paginationHelper } from "../../helpers/paginationHelper.js";

const createReviewSchema = z.object({
  body: z.object({
    propertyId: z.string().uuid("Invalid property ID"),
    rating: z
      .number()
      .int("Rating must be an integer")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),
    comment: z
      .string()
      .min(1, "Comment is required")
      .max(1000, "Comment cannot exceed 1000 characters"),
  }),
});

const propertyReviewsValidationSchema = z.object({
  params: z.object({
    propertyId: z.string().uuid("Invalid property ID"),
  }),
});

const landlordReviewsQuerySchema = z.object({
  query: z.object({
    propertyId: z.string().uuid("Invalid property ID").optional(),
    ...paginationHelper.paginationQueryFields(["createdAt", "rating"] as const),
  }),
});

export const ReviewValidation = {
  createReviewSchema,
  propertyReviewsValidationSchema,
  landlordReviewsQuerySchema,
};
