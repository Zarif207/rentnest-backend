import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { UserControllers } from "./user.controller.js";
import { UserValidation } from "./user.validation.js";

const router = express.Router();

router.get(
  "/",
  auth("ADMIN"),
  validateRequest(UserValidation.userQueryValidationSchema),
  UserControllers.getAllUsers,
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(UserValidation.updateUserStatusValidationSchema),
  UserControllers.updateUserStatus,
);

export const UserRoutes = router;