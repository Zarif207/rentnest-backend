import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CategoryServices } from "./category.service";

const createCategory = catchAsync(async (req, res) => {
  const result = await CategoryServices.createCategory(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

const getAllCategories = catchAsync(async (req, res) => {
  const result = await CategoryServices.getAllCategories();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories retrieved successfully",
    data: result,
  });
});

const getCategoryById = catchAsync(async (req, res) => {
  const result = await CategoryServices.getCategoryById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category retrieved successfully",
    data: result,
  });
});

const updateCategory = catchAsync(async (req, res) => {
  const result = await CategoryServices.updateCategory(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req, res) => {
  await CategoryServices.deleteCategory(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category deleted successfully",
    data: null,
  });
});

export const CategoryControllers = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};