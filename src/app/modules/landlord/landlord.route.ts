import express from "express";

import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { RentalControllers } from "../rental/rental.controller.js";
import { RentalValidation } from "../rental/rental.validation.js";
import { ReviewControllers } from "../review/review.controller.js";
import { ReviewValidation } from "../review/review.validation.js";

const router = express.Router();

router.get(
  "/requests",
  auth("LANDLORD"),
  validateRequest(RentalValidation.rentalStatusQuerySchema),
  RentalControllers.getLandlordRentalRequests,
);

router.patch(
  "/requests/:id",
  auth("LANDLORD"),
  validateRequest(RentalValidation.updateRentalStatusSchema),
  RentalControllers.updateRentalRequestStatus,
);

router.patch(
  "/requests/:id/complete",
  auth("LANDLORD"),
  validateRequest(RentalValidation.completeRentalValidationSchema),
  RentalControllers.completeRental,
);

router.get(
  "/reviews",
  auth("LANDLORD"),
  validateRequest(ReviewValidation.landlordReviewsQuerySchema),
  ReviewControllers.getLandlordReviews,
);

export const LandlordRoutes = router;