import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { ReviewControllers } from "./review.controller.js";
import { ReviewValidation } from "./review.validation.js";

const router = express.Router();

router.post(
  "/",
  auth("TENANT"),
  validateRequest(ReviewValidation.createReviewSchema),
  ReviewControllers.createReview,
);

router.get(
  "/property/:propertyId",
  ReviewControllers.getPropertyReviews,
);

export const ReviewRoutes = router;