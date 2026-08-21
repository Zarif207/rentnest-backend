import express from "express";
import auth from "../../middlewares/auth";
import { RentalControllers } from "./rental.controller";
import { RentalValidation } from "./rental.validation";
import validateRequest from "../../middlewares/validateRequest";

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
  RentalControllers.getRentalRequestById,
);

export const RentalRoutes = router;
