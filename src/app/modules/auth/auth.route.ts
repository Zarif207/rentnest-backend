import express from "express";
import { AuthControllers } from "./auth.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AuthValidation } from "./auth.validation";

const router = express.Router();

router.post(
  "/register",
  validateRequest(AuthValidation.registerValidationSchema),
  AuthControllers.registerUser,
);

router.post(
  "/login",
  validateRequest(AuthValidation.loginValidationSchema),
  AuthControllers.loginUser,
);

router.get(
  "/me",
  auth("TENANT", "LANDLORD", "ADMIN"),
  AuthControllers.getMe,
);

export const AuthRoutes = router;