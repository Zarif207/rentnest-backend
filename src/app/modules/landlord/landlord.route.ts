import express from "express";

import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { RentalControllers } from "../rental/rental.controller";
import { RentalValidation } from "../rental/rental.validation";

const router = express.Router();

router.get(
  "/requests",
  auth("LANDLORD"),
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


export const LandlordRoutes = router;