import express from "express";

import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PaymentControllers } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";

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
