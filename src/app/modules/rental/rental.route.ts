import express from "express";

import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { RentalControllers } from "./rental.controller.js";
import { RentalValidation } from "./rental.validation.js";

const router = express.Router();

router.post(
  "/",
  auth("TENANT"),
  validateRequest(RentalValidation.createRentalRequestSchema),
  RentalControllers.createRentalRequest,
);

router.get(
  "/",
  auth("TENANT"),
  validateRequest(RentalValidation.rentalStatusQuerySchema),
  RentalControllers.getMyRentalRequests,
);

router.get(
  "/:id",
  auth("TENANT", "LANDLORD"),
  validateRequest(RentalValidation.rentalIdValidationSchema),
  RentalControllers.getRentalRequestById,
);

// Landlord routes


// Admin routes
const adminRouter = express.Router();

adminRouter.get(
  "/",
  auth("ADMIN"),
  RentalControllers.getAllRentalRequestsForAdmin,
);

export const RentalRoutes = router;
export const AdminRentalRoutes = adminRouter;