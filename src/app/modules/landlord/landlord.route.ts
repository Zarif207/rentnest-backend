import express from "express";

import auth from "../../middlewares/auth";
import { RentalControllers } from "../rental/rental.controller";

const router = express.Router();

router.get(
  "/requests",
  auth("LANDLORD"),
  RentalControllers.getLandlordRentalRequests
);

router.patch(
  "/requests/:id",
  auth("LANDLORD"),
  RentalControllers.updateRentalRequestStatus
);

export const LandlordRoutes = router;