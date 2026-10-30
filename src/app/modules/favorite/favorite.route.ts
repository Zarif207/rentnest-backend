import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { FavoriteControllers } from "./favorite.controller.js";
import { FavoriteValidation } from "./favorite.validation.js";

const router = express.Router();

router.get(
  "/",
  auth("TENANT"),
  validateRequest(FavoriteValidation.favoriteQueryValidationSchema),
  FavoriteControllers.getMyFavorites,
);

router.get("/ids", auth("TENANT"), FavoriteControllers.getMyFavoriteIds);

router.post(
  "/",
  auth("TENANT"),
  validateRequest(FavoriteValidation.addFavoriteValidationSchema),
  FavoriteControllers.addFavorite,
);

router.delete(
  "/:propertyId",
  auth("TENANT"),
  validateRequest(FavoriteValidation.removeFavoriteValidationSchema),
  FavoriteControllers.removeFavorite,
);

export const FavoriteRoutes = router;
