import { z } from "zod";
import { PROPERTY_TYPES } from "../property/property.constant.js";
import { usStateSchema } from "../../validations/usState.validation.js";
import { HOMEPAGE_LIMITS, HOMEPAGE_SECTIONS } from "./siteSetting.constant.js";

const isUnique = <T>(values: T[]) => new Set(values).size === values.length;

const propertyIds = (max: number) =>
  z
    .array(z.string().uuid("Invalid property ID"))
    .max(max, `Pick at most ${max} properties`)
    .refine(isUnique, "Each property can only be picked once");

const homepageConfigSchema = z.object({
  hero: z.object({
    propertyIds: propertyIds(HOMEPAGE_LIMITS.hero),
  }),
  featured: z.object({
    enabled: z.boolean(),
    title: z.string().trim().min(1).max(80).optional(),
    propertyIds: propertyIds(HOMEPAGE_LIMITS.featured),
  }),
  states: z.object({
    enabled: z.boolean(),
    items: z
      .array(
        z.object({
          state: usStateSchema("State"),
          imageUrl: z.string().url("Each state needs a valid image URL"),
        }),
      )
      .max(
        HOMEPAGE_LIMITS.states,
        `Pick at most ${HOMEPAGE_LIMITS.states} states`,
      )
      .refine(
        (items) => isUnique(items.map((item) => item.state)),
        "Each state can only be added once",
      ),
  }),
  propertyTypes: z.object({
    enabled: z.boolean(),
    items: z
      .array(
        z.object({
          type: z.enum(PROPERTY_TYPES),
          imageUrl: z.string().url("Invalid image URL").optional(),
        }),
      )
      .refine(
        (items) => isUnique(items.map((item) => item.type)),
        "Each property type can only be added once",
      ),
  }),
  latest: z.object({
    enabled: z.boolean(),
    count: z
      .number()
      .int()
      .min(HOMEPAGE_LIMITS.latestMin)
      .max(HOMEPAGE_LIMITS.latestMax),
  }),
  sectionOrder: z
    .array(z.enum(HOMEPAGE_SECTIONS))
    .refine(isUnique, "Each section can only appear once"),
});

const updateHomepageValidationSchema = z.object({
  body: homepageConfigSchema,
});

export const SiteSettingValidation = {
  homepageConfigSchema,
  updateHomepageValidationSchema,
};
