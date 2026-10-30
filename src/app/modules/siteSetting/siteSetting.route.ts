import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { SiteSettingControllers } from "./siteSetting.controller.js";
import { SiteSettingValidation } from "./siteSetting.validation.js";

// Public (mounted at /api/site-settings)
const router = express.Router();

router.get("/homepage", SiteSettingControllers.getHomepage);

// Admin (mounted at /api/admin/site-settings)
const adminRouter = express.Router();

adminRouter.get(
  "/homepage",
  auth("ADMIN"),
  SiteSettingControllers.getHomepageConfig,
);

adminRouter.put(
  "/homepage",
  auth("ADMIN"),
  validateRequest(SiteSettingValidation.updateHomepageValidationSchema),
  SiteSettingControllers.updateHomepageConfig,
);

export const SiteSettingRoutes = router;
export const AdminSiteSettingRoutes = adminRouter;
