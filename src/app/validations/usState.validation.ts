import { z } from "zod";
import { normalizeUsState } from "../constants/usStates.js";

// A US state: accepts the 2-letter code or the name (any case) and outputs
// the full name, e.g. "mi" → "Michigan". Anything else is a validation error.
export const usStateSchema = (field = "Division") =>
  z.string().transform((value, ctx) => {
    const state = normalizeUsState(value);
    if (!state) {
      ctx.addIssue({
        code: "custom",
        message: `${field} must be a US state (full name or 2-letter code)`,
      });
      return z.NEVER;
    }
    return state;
  });
