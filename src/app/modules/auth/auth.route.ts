import express from "express";
import { AuthControllers } from "./auth.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

router.post("/register", AuthControllers.registerUser);
router.post("/login", AuthControllers.loginUser);
router.get(
  "/me",
  auth("TENANT", "LANDLORD", "ADMIN"),
  AuthControllers.getMe
);

export const AuthRoutes = router;