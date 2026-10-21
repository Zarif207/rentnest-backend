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
  userQueryValidationSchema,
  updateUserValidationSchema,
  updateUserStatusValidationSchema,
};