import { z } from "zod";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { favoriteSortableFields } from "./favorite.constant.js";

const favoriteQueryValidationSchema = z.object({
  query: z.object({
    ...paginationHelper.paginationQueryFields(favoriteSortableFields),
  }),
});

const addFavoriteValidationSchema = z.object({
  body: z.object({
    propertyId: z.string().uuid("Invalid property ID"),
  }),
});

const removeFavoriteValidationSchema = z.object({
  params: z.object({
    propertyId: z.string().uuid("Invalid property ID"),
  }),
});

export const FavoriteValidation = {
  favoriteQueryValidationSchema,
  addFavoriteValidationSchema,
  removeFavoriteValidationSchema,
};
