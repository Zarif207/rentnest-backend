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

// Before "/:id/read" so "read-all" isn't taken for an id.
router.patch(
  "/read-all",
  auth("TENANT", "LANDLORD", "ADMIN"),
  NotificationControllers.markAllAsRead,
);

router.patch(
  "/:id/read",
  auth("TENANT", "LANDLORD", "ADMIN"),
  validateRequest(NotificationValidation.notificationIdValidationSchema),
  NotificationControllers.markAsRead,
);

export const NotificationRoutes = router;
