import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { NotificationControllers } from "./notification.controller.js";
import { NotificationValidation } from "./notification.validation.js";

const router = express.Router();

router.get(
  "/",
  auth("TENANT", "LANDLORD", "ADMIN"),
  validateRequest(NotificationValidation.notificationQueryValidationSchema),
  NotificationControllers.getMyNotifications,
);

router.get(
  "/summary",
  auth("TENANT", "LANDLORD", "ADMIN"),
  NotificationControllers.getSummary,
);

// Before "/:id/read" so "read-all" and "read-by-link" aren't taken for ids.
router.patch(
  "/read-all",
  auth("TENANT", "LANDLORD", "ADMIN"),
  NotificationControllers.markAllAsRead,
);

router.patch(
  "/read-by-link",
  auth("TENANT", "LANDLORD", "ADMIN"),
  validateRequest(NotificationValidation.readByLinkValidationSchema),
  NotificationControllers.markReadByLink,
);

router.patch(
  "/:id/read",
  auth("TENANT", "LANDLORD", "ADMIN"),
  validateRequest(NotificationValidation.notificationIdValidationSchema),
  NotificationControllers.markAsRead,
);

export const NotificationRoutes = router;
