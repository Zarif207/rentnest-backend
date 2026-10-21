import { z } from "zod";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { userSortableFields } from "./user.constant.js";

const userQueryValidationSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    role: z.enum(["ADMIN", "LANDLORD", "TENANT"]).optional(),
    userStatus: z.enum(["ACTIVE", "BLOCKED"]).optional(),
    ...paginationHelper.paginationQueryFields(userSortableFields),
  }),
});

// strictObject rejects role, userStatus, password and any other field.
const updateMyProfileValidationSchema = z.object({
  body: z
    .strictObject({
      name: z.string().trim().min(1, "Name cannot be empty").optional(),
      email: z.email("Invalid email address").optional(),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9]{7,15}$/, "Invalid phone number")
        .optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "Provide at least one field to update (name, email or phone)",
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
  userQueryValidationSchema,
  updateMyProfileValidationSchema,
  updateUserStatusValidationSchema,
};