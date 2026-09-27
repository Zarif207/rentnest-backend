import express from "express";

import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PaymentControllers } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";

const router = express.Router();

router.post(
  "/",
  auth("TENANT"),
  validateRequest(PaymentValidation.createPaymentSchema),
  PaymentControllers.createPayment
);

router.get(
  "/",
  auth("TENANT"),
  PaymentControllers.getMyPayments
);

router.get(
  "/:id",
  auth("TENANT"),
  PaymentControllers.getPaymentById
);

router.patch(
  "/:id/confirm",
  auth("TENANT"),
  PaymentControllers.confirmPayment
);

router.post(
  "/checkout",
  auth("TENANT"),
  PaymentControllers.createStripeCheckoutSession,
);

export const PaymentRoutes = router;