import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { PropertyControllers } from "./property.controller.js";
import { PropertyValidations } from "./property.validation.js";

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

landlordRouter.get(
  "/",
  auth("LANDLORD"),
  validateRequest(PropertyValidations.propertyQueryValidationSchema),
  PropertyControllers.getMyProperties,
);

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
