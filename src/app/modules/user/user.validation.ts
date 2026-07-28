import { z } from "zod";

const updateUserValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export const UserValidation = {
  updateUserValidationSchema,
};