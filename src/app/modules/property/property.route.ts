import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { PropertyControllers } from "./property.controller";
import { PropertyValidations } from "./property.validation";

const router = express.Router();

// Public routes
router.get(
  "/",
  validateRequest(PropertyValidations.propertyQueryValidationSchema),
  PropertyControllers.getAllProperties,
);

router.get(
  "/:id",
  validateRequest(PropertyValidations.propertyIdValidationSchema),
  PropertyControllers.getPropertyById,
);

// Landlord routes
const landlordRouter = express.Router();

landlordRouter.post(
  "/",
  auth("LANDLORD"),
  validateRequest(PropertyValidations.createPropertyValidationSchema),
  PropertyControllers.createProperty,
);

landlordRouter.put(
  "/:id",
  auth("LANDLORD"),
  validateRequest(PropertyValidations.updatePropertyValidationSchema),
  PropertyControllers.updateProperty,
);

landlordRouter.delete(
  "/:id",
  auth("LANDLORD"),
  validateRequest(PropertyValidations.propertyIdValidationSchema),
  PropertyControllers.deleteProperty,
);

// Admin routes
const adminRouter = express.Router();

adminRouter.get(
  "/",
  auth("ADMIN"),
  validateRequest(PropertyValidations.propertyQueryValidationSchema),
  PropertyControllers.getAllPropertiesForAdmin,
);

export const PropertyRoutes = router;
export const LandlordPropertyRoutes = landlordRouter;
export const AdminPropertyRoutes = adminRouter;
