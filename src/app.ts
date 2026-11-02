/// <reference path="./app/types/express.d.ts" />
import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import router from "./app/routes/index.js";
import { PaymentControllers } from "./app/modules/payment/payment.controller.js";
import globalErrorHandler from "./app/middlewares/globalErrorHandler.js";
import notFound from "./app/middlewares/notFound.js";
import maskForObserver from "./app/middlewares/maskForObserver.js";
import observerReadOnly from "./app/middlewares/observerReadOnly.js";
import {
  authLimiter,
  createLimiter,
  globalLimiter,
  paymentLimiter,
} from "./app/middlewares/rateLimits.js";
import { assertSecurityConfig, corsOrigins } from "./config/security.js";

assertSecurityConfig();

const app: Application = express();

app.disable("x-powered-by");
// One proxy hop (Vercel), so rate limits see the client's IP.
app.set("trust proxy", 1);
app.use(helmet());

// Stripe calls the webhook server to server: no CORS, and the raw body must
// reach the signature check, so it's registered before cors and express.json.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  PaymentControllers.handleStripeWebhook,
);

// Only the configured browser origins; requests without an Origin header
// (curl, server to server) aren't affected by CORS.
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || corsOrigins.includes(origin)),
  }),
);

app.use("/api", globalLimiter);
app.post(["/api/auth/login", "/api/auth/register"], authLimiter);
app.post(
  ["/api/payments/create", "/api/payments/checkout", "/api/offers/:id/deposit"],
  paymentLimiter,
);
app.post(["/api/reviews", "/api/offers", "/api/rentals"], createLimiter);

app.use(express.json({ limit: "100kb" }));

// Observers: writes are refused, and every response they get is masked.
app.use("/api", observerReadOnly, maskForObserver);

app.use("/api", router);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "RentNest Backend API is running 🚀",
  });
});

app.use(notFound);

app.use(globalErrorHandler);

export default app;
