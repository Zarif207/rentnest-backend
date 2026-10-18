import express from "express";
import { AuthControllers } from "./auth.controller.js";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { AuthValidation } from "./auth.validation.js";

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