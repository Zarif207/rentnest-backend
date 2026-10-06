import express from "express";

import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { RentalControllers } from "./rental.controller";
import { RentalValidation } from "./rental.validation";

const router = express.Router();

router.post(
  "/",
  auth("TENANT"),
  validateRequest(RentalValidation.createRentalRequestSchema),
  RentalControllers.createRentalRequest,
);

router.get("/", auth("TENANT"), RentalControllers.getMyRentalRequests);

router.get(
  "/:id",
  auth("TENANT", "LANDLORD"),
  validateRequest(RentalValidation.rentalIdValidationSchema),
  RentalControllers.getRentalRequestById,
);

// Landlord routes
const landlordRouter = express.Router();

landlordRouter.patch(
  "/requests/:id",
  auth("LANDLORD"),
  validateRequest(RentalValidation.updateRentalStatusSchema),
  RentalControllers.updateRentalRequestStatus,
);

// Admin routes
const adminRouter = express.Router();

adminRouter.get(
  "/",
  auth("ADMIN"),
  RentalControllers.getAllRentalRequestsForAdmin,
);

export const RentalRoutes = router;
export const LandlordRentalRoutes = landlordRouter;
export const AdminRentalRoutes = adminRouter;