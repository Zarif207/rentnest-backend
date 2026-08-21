import { z } from "zod";

import { PROPERTY_TYPES } from "./property.constant";

const createPropertyValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    division: z.string().min(1, "Division is required"),

    rentAmount: z.coerce
      .number()
      .positive("Rent amount must be greater than 0"),

    bedrooms: z.coerce
      .number()
      .int()
      .nonnegative("Bedrooms cannot be negative"),

    bathrooms: z.coerce
      .number()
      .int()
      .nonnegative("Bathrooms cannot be negative"),

    area: z.coerce
      .number()
      .int()
      .positive("Area must be greater than 0"),

    propertyType: z.enum(PROPERTY_TYPES),

    images: z
      .array(z.string().url("Each image must be a valid URL"))
      .min(1, "At least one image is required"),
  }),
});


const updatePropertyValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),

    description: z.string().min(1).optional(),

    address: z.string().min(1).optional(),

    city: z.string().min(1).optional(),

    division: z.string().min(1).optional(),

    rentAmount: z.coerce
      .number()
      .positive()
      .optional(),

    bedrooms: z.coerce
      .number()
      .int()
      .nonnegative()
      .optional(),

    bathrooms: z.coerce
      .number()
      .int()
      .nonnegative()
      .optional(),

    area: z.coerce
      .number()
      .int()
      .positive()
      .optional(),

    propertyType: z.enum(PROPERTY_TYPES).optional(),

    availabilityStatus: z
      .enum(["AVAILABLE", "RENTED"])
      .optional(),

    images: z
      .array(z.string().url())
      .optional(),
  }),
});

export const PropertyValidations = {
  createPropertyValidationSchema,
  updatePropertyValidationSchema,
};