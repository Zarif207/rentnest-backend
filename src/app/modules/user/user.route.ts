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

router.patch(
  "/:id/landlord-status",
  auth("ADMIN"),
  validateRequest(UserValidation.updateLandlordStatusValidationSchema),
  UserControllers.updateLandlordStatus,
);

// Profile routes for any signed-in user (mounted at /api/users)
const profileRouter = express.Router();

profileRouter.patch(
  "/me",
  auth("TENANT", "LANDLORD", "ADMIN"),
  validateRequest(UserValidation.updateMyProfileValidationSchema),
  UserControllers.updateMyProfile,
);

export const UserRoutes = router;
export const ProfileRoutes = profileRouter;
