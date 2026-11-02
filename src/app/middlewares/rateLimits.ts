import { rateLimit } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

const limiter = (limit: number, message: string) =>
  rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Same envelope as every other error.
    message: {
      success: false,
      message,
      errorDetails: [{ path: "", message }],
    },
  });

/** Every /api request: 300 per 15 minutes per IP. */
export const globalLimiter = limiter(
  300,
  "Too many requests. Please try again in a few minutes.",
);

/** Login and register: 10 per 15 minutes per IP. */
export const authLimiter = limiter(
  10,
  "Too many sign-in attempts. Please try again in 15 minutes.",
);

/** Starting a rent payment or a deposit: 20 per 15 minutes per IP. */
export const paymentLimiter = limiter(
  20,
  "Too many payment attempts. Please try again in a few minutes.",
);

/** Creating reviews, offers and rental requests: 30 per 15 minutes per IP. */
export const createLimiter = limiter(
  30,
  "Too many requests. Please try again in a few minutes.",
);
