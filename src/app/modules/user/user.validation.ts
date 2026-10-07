import { z } from "zod";

const updateUserValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
  }),
});

const updateUserStatusValidationSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID"),
  }),
  body: z.object({
    userStatus: z.enum(["ACTIVE", "BLOCKED"]),
  }),
});

export const UserValidation = {
  updateUserValidationSchema,
  updateUserStatusValidationSchema,
};