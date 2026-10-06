import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { CategoryControllers } from "./category.controller";
import { CategoryValidation } from "./category.validation";

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
