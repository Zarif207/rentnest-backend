import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ReviewControllers } from "./review.controller";
import { ReviewValidation } from "./review.validation";

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