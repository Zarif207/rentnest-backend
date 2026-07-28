import { z } from "zod";

const registerValidationSchema = z.object({
  body: z.object({
    name: z.string(),
    email: z.email(),
    password: z.string().min(6),
    phone: z.string().optional(),
    role: z.enum(["ADMIN", "LANDLORD", "TENANT"]),
  }),
});

const loginValidationSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string(),
  }),
});

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
};