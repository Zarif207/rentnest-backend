import { z } from "zod";

const registerValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
    role: z.enum(["TENANT", "LANDLORD"]),
  }),
});

const loginValidationSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(1, "Password is required"),
  }),
});

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
};