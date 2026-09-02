import { z } from "zod";

const createReviewSchema = z.object({
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
});

export const ReviewValidation = {
  createReviewSchema,
};