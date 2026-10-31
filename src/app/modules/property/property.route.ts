import express from "express";
import auth from "../../middlewares/auth.js";
import requireApprovedLandlord from "../../middlewares/requireApprovedLandlord.js";
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

// Before "/:id", which would otherwise reject these as invalid ids.
router.get(
  "/map",
  validateRequest(PropertyValidations.listingTypeQueryValidationSchema),
  PropertyControllers.getMapProperties,
);
router.get(
  "/states",
  validateRequest(PropertyValidations.listingTypeQueryValidationSchema),
  PropertyControllers.getPropertyStates,
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
  requireApprovedLandlord,
  validateRequest(PropertyValidations.createPropertyValidationSchema),
  PropertyControllers.createProperty,
);

landlordRouter.put(
  "/:id",
  auth("LANDLORD"),
  requireApprovedLandlord,
  validateRequest(PropertyValidations.updatePropertyValidationSchema),
  PropertyControllers.updateProperty,
);

landlordRouter.delete(
  "/:id",
  auth("LANDLORD"),
  requireApprovedLandlord,
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
