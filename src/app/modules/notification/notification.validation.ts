import { z } from "zod";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { notificationSortableFields } from "./notification.constant.js";

const notificationQueryValidationSchema = z.object({
  query: z.object({
    // ?unread=true lists only unread notifications.
    unread: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    ...paginationHelper.paginationQueryFields(notificationSortableFields),
  }),
});

const notificationIdValidationSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid notification ID"),
  }),
});

// Only in-app dashboard links can be cleared this way.
const readByLinkValidationSchema = z.object({
  body: z.object({
    linkPrefix: z
      .string()
      .trim()
      .max(300, "Link prefix must be at most 300 characters")
      .startsWith("/dashboard/", "Link prefix must start with /dashboard/"),
  }),
});

export const NotificationValidation = {
  notificationQueryValidationSchema,
  notificationIdValidationSchema,
  readByLinkValidationSchema,
};
