import { z } from "zod";

const createPropertyValidationSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    address: z.string().min(3),
    city: z.string().min(2),
    division: z.string().min(2),

    rentAmount: z.number().positive(),

    bedrooms: z.number().int().nonnegative(),
    bathrooms: z.number().int().positive(),
    area: z.number().int().positive(),

    propertyType: z.enum([
      "APARTMENT",
      "HOUSE",
      "STUDIO",
      "VILLA",
    ]),

    availabilityStatus: z
      .enum(["AVAILABLE", "RENTED"])
      .optional(),

    images: z.array(z.string()).optional(),
  }),
});

export const PropertyValidation = {
  createPropertyValidationSchema,
};