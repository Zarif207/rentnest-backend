import express from "express";

import auth from "../../middlewares/auth";
import { PropertyControllers } from "./property.controller";

const router = express.Router();

router.get("/", PropertyControllers.getAllProperties);
router.get("/:id", PropertyControllers.getPropertyById);

const landlordRouter = express.Router();

landlordRouter.post("/", auth("LANDLORD"), PropertyControllers.createProperty);

landlordRouter.put(
  "/:id",
  auth("LANDLORD"),
  PropertyControllers.updateProperty,
);

landlordRouter.delete(
  "/:id",
  auth("LANDLORD"),
  PropertyControllers.deleteProperty,
);

const adminRouter = express.Router();
adminRouter.get(
  "/",
  auth("ADMIN"),
  PropertyControllers.getAllPropertiesForAdmin,
);

export const PropertyRoutes = router;
export const LandlordPropertyRoutes = landlordRouter;
export const AdminPropertyRoutes = adminRouter;
