import express from "express";

import auth from "../../middlewares/auth";
import { PropertyControllers } from "./property.controller";

const router = express.Router();

router.get("/", PropertyControllers.getAllProperties);
router.get("/:id", PropertyControllers.getPropertyById);

const landlordRouter = express.Router();

landlordRouter.post(
  "/",
  auth("LANDLORD"),
  PropertyControllers.createProperty
);
export const PropertyRoutes = router;
export const LandlordPropertyRoutes = landlordRouter;