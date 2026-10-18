import express from "express";

import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { PaymentControllers } from "./payment.controller.js";
import { PaymentValidation } from "./payment.validation.js";

const router = express.Router();

router.get("/", auth("TENANT"), PaymentControllers.getMyPayments);

router.get(
  "/:id",
  auth("TENANT"),
  validateRequest(PaymentValidation.paymentIdValidationSchema),
  PaymentControllers.getPaymentById,
);

router.post(
  "/checkout",
  auth("TENANT"),
  validateRequest(PaymentValidation.createStripeCheckoutSessionSchema),
  PaymentControllers.createStripeCheckoutSession,
);

export const PaymentRoutes = router;
