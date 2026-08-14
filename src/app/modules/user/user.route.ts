import express from "express";
import auth from "../../middlewares/auth";
import { UserControllers } from "./user.controller";

const router = express.Router();

router.get("/", auth("ADMIN"), UserControllers.getAllUsers);

router.patch("/:id", auth("ADMIN"), UserControllers.updateUserStatus);

export const UserRoutes = router;
