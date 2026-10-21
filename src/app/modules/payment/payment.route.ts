import express from "express";

import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { PaymentControllers } from "./payment.controller.js";
import { PaymentValidation } from "./payment.validation.js";

const router = express.Router();

router.get("/", auth("TENANT"), PaymentControllers.getMyPayments);

const createPaymentHandlers = [
  auth("TENANT"),
  validateRequest(PaymentValidation.createStripeCheckoutSessionSchema),
  PaymentControllers.createStripeCheckoutSession,
];

router.post("/create", ...createPaymentHandlers);

// Alias kept for backwards compatibility.
router.post("/checkout", ...createPaymentHandlers);

router.post(
  "/confirm",
  auth("TENANT"),
  validateRequest(PaymentValidation.confirmPaymentSchema),
  PaymentControllers.confirmPayment,
);

router.get(
  "/:id",
  auth("TENANT"),
  validateRequest(PaymentValidation.paymentIdValidationSchema),
  PaymentControllers.getPaymentById,
);

export const PaymentRoutes = router;
