import express from "express";
import auth from "../../middlewares/auth.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { CategoryControllers } from "./category.controller.js";
import { CategoryValidation } from "./category.validation.js";

const router = express.Router();

router.get("/", CategoryControllers.getAllCategories);

router.get(
  "/:id",
  validateRequest(CategoryValidation.categoryIdValidationSchema),
  CategoryControllers.getCategoryById,
);

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(CategoryValidation.createCategoryValidationSchema),
  CategoryControllers.createCategory,
);

router.put(
  "/:id",
  auth("ADMIN"),
  validateRequest(CategoryValidation.updateCategoryValidationSchema),
  CategoryControllers.updateCategory,
);

router.delete(
  "/:id",
  auth("ADMIN"),
  validateRequest(CategoryValidation.categoryIdValidationSchema),
  CategoryControllers.deleteCategory,
);

export const CategoryRoutes = router;
