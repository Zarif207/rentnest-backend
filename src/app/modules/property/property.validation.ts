import { z } from "zod";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { normalizeUsState } from "../../constants/usStates.js";
import { usStateSchema } from "../../validations/usState.validation.js";
import {
  PROPERTY_TYPES,
  AVAILABILITY_STATUSES,
  LISTING_TYPES,
  RENTAL_AVAILABILITY_STATUSES,
  propertySortableFields,
} from "./property.constant.js";

// `division` is a US state, stored as the full name (see usStateSchema).
const usStateField = usStateSchema();

const latitudeField = z.coerce
  .number()
  .min(-90, "Latitude must be between -90 and 90")
  .max(90, "Latitude must be between -90 and 90");

const longitudeField = z.coerce
  .number()
  .min(-180, "Longitude must be between -180 and 180")
  .max(180, "Longitude must be between -180 and 180");

// A pin needs both values; one on its own is rejected.
const hasCoordinatePair = (body: { latitude?: number; longitude?: number }) =>
  (body.latitude === undefined) === (body.longitude === undefined);

const coordinatePairError = {
  message: "Send latitude and longitude together",
  path: ["latitude"],
};

const rentAmountField = z.coerce
  .number()
  .positive("Rent amount must be greater than 0");

const salePriceField = z.coerce
  .number()
  .positive("Sale price must be greater than 0");

const createPropertyValidationSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
      address: z.string().min(1, "Address is required"),
      city: z.string().min(1, "City is required"),
      division: usStateField,

      // RENT needs rentAmount, SALE needs salePrice; the other one is dropped.
      listingType: z.enum(LISTING_TYPES).default("RENT"),
      rentAmount: rentAmountField.optional(),
      salePrice: salePriceField.optional(),

      bedrooms: z.coerce
        .number()
        .int()
        .nonnegative("Bedrooms cannot be negative"),

      bathrooms: z.coerce
        .number()
        .int()
        .nonnegative("Bathrooms cannot be negative"),

      area: z.coerce.number().int().positive("Area must be greater than 0"),

      propertyType: z.enum(PROPERTY_TYPES),

      categoryId: z.string().uuid("Invalid category ID"),

      amenities: z
        .array(z.string().min(1, "Amenity cannot be empty"))
        .min(1, "At least one amenity is required"),

      images: z
        .array(z.string().url("Each image must be a valid URL"))
        .min(1, "At least one image is required"),

      latitude: latitudeField.optional(),
      longitude: longitudeField.optional(),
    })
    .refine(hasCoordinatePair, coordinatePairError)
    .superRefine((body, ctx) => {
      if (body.listingType === "RENT" && body.rentAmount === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Rent amount is required for a rental listing",
          path: ["rentAmount"],
        });
      }
      if (body.listingType === "SALE" && body.salePrice === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Sale price is required for a listing for sale",
          path: ["salePrice"],
        });
      }
    })
    .transform(({ rentAmount, salePrice, ...body }) =>
      body.listingType === "SALE"
        ? { ...body, salePrice }
        : { ...body, rentAmount },
    ),
});

const updatePropertyValidationSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid property ID"),
  }),

  body: z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      address: z.string().min(1).optional(),
      city: z.string().min(1).optional(),
      division: usStateField.optional(),

      // Checked against the listing in the service (type changes, which
      // price applies).
      listingType: z.enum(LISTING_TYPES).optional(),
      rentAmount: rentAmountField.optional(),
      salePrice: salePriceField.optional(),

      bedrooms: z.coerce.number().int().nonnegative().optional(),

      bathrooms: z.coerce.number().int().nonnegative().optional(),

      area: z.coerce.number().int().positive().optional(),

      propertyType: z.enum(PROPERTY_TYPES).optional(),
      availabilityStatus: z.enum(RENTAL_AVAILABILITY_STATUSES).optional(),
      categoryId: z.string().uuid("Invalid category ID").optional(),

      amenities: z
        .array(z.string().min(1, "Amenity cannot be empty"))
        .optional(),

      images: z.array(z.string().url()).optional(),

      latitude: latitudeField.optional(),
      longitude: longitudeField.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "Provide at least one field to update",
    })
    .refine(hasCoordinatePair, coordinatePairError),
});

const propertyIdValidationSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid property ID"),
  }),
});

const propertyQueryValidationSchema = z.object({
  query: z
    .object({
      searchTerm: z.string().optional(),
      listingType: z.enum(LISTING_TYPES).optional(),
      city: z.string().optional(),
      // Filter by code or name ("MI" finds Michigan); unknown values pass through.
      division: z
        .string()
        .transform((value) => normalizeUsState(value) ?? value)
        .optional(),

      propertyType: z.enum(PROPERTY_TYPES).optional(),

      availabilityStatus: z.enum(AVAILABILITY_STATUSES).optional(),

      categoryId: z.string().uuid("Invalid category ID").optional(),

      amenities: z.string().optional(),

      minPrice: z.coerce
        .number()
        .positive("Minimum price must be greater than 0")
        .optional(),

      maxPrice: z.coerce
        .number()
        .positive("Maximum price must be greater than 0")
        .optional(),

      ...paginationHelper.paginationQueryFields(propertySortableFields),
    })
    .refine(
      (query) =>
        query.minPrice === undefined ||
        query.maxPrice === undefined ||
        query.minPrice <= query.maxPrice,
      {
        message: "Minimum price cannot be greater than maximum price",
        path: ["minPrice"],
      },
    ),
});

// GET /properties/map and /properties/states.
const listingTypeQueryValidationSchema = z.object({
  query: z.object({
    listingType: z.enum(LISTING_TYPES).optional(),
  }),
});

export const PropertyValidations = {
  createPropertyValidationSchema,
  updatePropertyValidationSchema,
  propertyIdValidationSchema,
  propertyQueryValidationSchema,
  listingTypeQueryValidationSchema,
};
