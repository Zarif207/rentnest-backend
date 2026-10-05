import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { UserControllers } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = express.Router();

router.get(
  "/",
  auth("ADMIN"),
  UserControllers.getAllUsers,
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(UserValidation.updateUserStatusValidationSchema),
  UserControllers.updateUserStatus,
);

export const UserRoutes = router;