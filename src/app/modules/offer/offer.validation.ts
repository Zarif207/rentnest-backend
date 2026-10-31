import { z } from "zod";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import {
  OFFER_ACTIONS,
  OFFER_FINANCING,
  OFFER_STATUSES,
  offerSortableFields,
} from "./offer.constant.js";

const amountField = (label: string) =>
  z.coerce
    .number()
    .positive(`${label} must be greater than 0`)
    .max(1_000_000_000, `${label} is too large`);

const offerIdParams = z.object({
  id: z.string().uuid("Invalid offer ID"),
});

const createOfferSchema = z.object({
  body: z.object({
    propertyId: z.string().uuid("Invalid property ID"),
    offerAmount: amountField("Offer amount"),
    financing: z.enum(OFFER_FINANCING),
    message: z
      .string()
      .trim()
      .max(500, "Message must be at most 500 characters")
      .optional()
      .transform((value) => value || undefined),
  }),
});

const offerIdSchema = z.object({
  params: offerIdParams,
});

const offerStatusQuerySchema = z.object({
  query: z.object({
    status: z.enum(OFFER_STATUSES).optional(),
  }),
});

const adminOfferQuerySchema = z.object({
  query: z.object({
    status: z.enum(OFFER_STATUSES).optional(),
    ...paginationHelper.paginationQueryFields(offerSortableFields),
  }),
});

const respondToOfferSchema = z.object({
  params: offerIdParams,
  body: z
    .object({
      action: z.enum(OFFER_ACTIONS),
      counterAmount: amountField("Counter amount").optional(),
    })
    .refine(
      (body) => body.action !== "COUNTER" || body.counterAmount !== undefined,
      {
        message: "A counteroffer needs a counter amount",
        path: ["counterAmount"],
      },
    ),
});

const confirmDepositSchema = z.object({
  body: z.object({
    sessionId: z
      .string()
      .regex(
        /^cs_(test|live)_[A-Za-z0-9]+$/,
        "Invalid Stripe checkout session ID",
      ),
  }),
});

export const OfferValidation = {
  createOfferSchema,
  offerIdSchema,
  offerStatusQuerySchema,
  adminOfferQuerySchema,
  respondToOfferSchema,
  confirmDepositSchema,
};
