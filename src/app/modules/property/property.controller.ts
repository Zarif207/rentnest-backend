import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

import { PropertyServices } from "./property.service";

const getAllProperties = catchAsync(async (req, res) => {
  const result = await PropertyServices.getAllProperties(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Properties retrieved successfully",
    data: result,
  });
});

const createProperty = catchAsync(async (req, res) => {
  const result = await PropertyServices.createProperty(
    req.body,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Property created successfully",
    data: result,
  });
});

const getPropertyById = catchAsync(async (req, res) => {
  const result = await PropertyServices.getPropertyById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property retrieved successfully",
    data: result,
  });
});

const updateProperty = catchAsync(async (req, res) => {
  const result = await PropertyServices.updateProperty(
    req.params.id as string,
    req.user.userId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property updated successfully",
    data: result,
  });
});

const deleteProperty = catchAsync(async (req, res) => {
  await PropertyServices.deleteProperty(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property deleted successfully",
    data: null,
  });
});

export const PropertyControllers = {
  getAllProperties,
  createProperty,
  getPropertyById,
  updateProperty,
  deleteProperty,
};
