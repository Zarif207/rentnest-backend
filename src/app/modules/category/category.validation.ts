import { z } from "zod";

const createCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Category name is required"),
  }),
});

const updateCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Category name is required"),
  }),
});

export const CategoryValidation = {
  createCategoryValidationSchema,
  updateCategoryValidationSchema,
};