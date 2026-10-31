import express from "express";

import auth from "../../middlewares/auth.js";
import requireApprovedLandlord from "../../middlewares/requireApprovedLandlord.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { OfferControllers } from "./offer.controller.js";
import { OfferValidation } from "./offer.validation.js";

// Buyer routes (tenants buy too)
const router = express.Router();

router.post(
  "/",
  auth("TENANT"),
  validateRequest(OfferValidation.createOfferSchema),
  OfferControllers.createOffer,
);

router.get(
  "/",
  auth("TENANT"),
  validateRequest(OfferValidation.offerStatusQuerySchema),
  OfferControllers.getMyOffers,
);

// Before "/:id", which would otherwise reject these as invalid ids.
router.get("/payments", auth("TENANT"), OfferControllers.getMyDeposits);

router.post(
  "/confirm",
  auth("TENANT"),
  validateRequest(OfferValidation.confirmDepositSchema),
  OfferControllers.confirmDeposit,
);

router.get(
  "/:id",
  auth("TENANT", "LANDLORD", "ADMIN"),
  validateRequest(OfferValidation.offerIdSchema),
  OfferControllers.getOfferById,
);

router.patch(
  "/:id/withdraw",
  auth("TENANT"),
  validateRequest(OfferValidation.offerIdSchema),
  OfferControllers.withdrawOffer,
);

router.patch(
  "/:id/accept-counter",
  auth("TENANT"),
  validateRequest(OfferValidation.offerIdSchema),
  OfferControllers.acceptCounter,
);

router.post(
  "/:id/deposit",
  auth("TENANT"),
  validateRequest(OfferValidation.offerIdSchema),
  OfferControllers.createDepositCheckout,
);

// Owner routes (writes need an approved landlord, like every other one)
const landlordRouter = express.Router();

landlordRouter.get(
  "/",
  auth("LANDLORD"),
  validateRequest(OfferValidation.offerStatusQuerySchema),
  OfferControllers.getLandlordOffers,
);

landlordRouter.patch(
  "/:id",
  auth("LANDLORD"),
  requireApprovedLandlord,
  validateRequest(OfferValidation.respondToOfferSchema),
  OfferControllers.respondToOffer,
);

landlordRouter.patch(
  "/:id/complete-sale",
  auth("LANDLORD"),
  requireApprovedLandlord,
  validateRequest(OfferValidation.offerIdSchema),
  OfferControllers.completeSale,
);

// Admin routes
const adminRouter = express.Router();

adminRouter.get(
  "/",
  auth("ADMIN"),
  validateRequest(OfferValidation.adminOfferQuerySchema),
  OfferControllers.getAllOffersForAdmin,
);

export const OfferRoutes = router;
export const LandlordOfferRoutes = landlordRouter;
export const AdminOfferRoutes = adminRouter;
