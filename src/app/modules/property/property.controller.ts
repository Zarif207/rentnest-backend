import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import pick from "../../utils/pick.js";
import { paginationFields } from "../../helpers/paginationHelper.js";

import { PropertyServices } from "./property.service.js";
import { propertyFilterableFields } from "./property.constant.js";
import { TListingType } from "./property.interface.js";

const getAllProperties = catchAsync(async (req, res) => {
  const filters = pick(req.query, propertyFilterableFields);
  const options = pick(req.query, paginationFields);
  const result = await PropertyServices.getAllProperties(filters, options, {
    hideSold: true,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Properties retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllPropertiesForAdmin = catchAsync(async (req, res) => {
  const filters = pick(req.query, propertyFilterableFields);
  const options = pick(req.query, paginationFields);
  const result = await PropertyServices.getAllProperties(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All properties retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyProperties = catchAsync(async (req, res) => {
  const filters = {
    ...pick(req.query, propertyFilterableFields),
    ownerId: req.user.userId,
  };
  const options = pick(req.query, paginationFields);
  const result = await PropertyServices.getAllProperties(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your properties retrieved successfully",
    meta: result.meta,
    data: result.data,
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

const getMapProperties = catchAsync(async (req, res) => {
  const result = await PropertyServices.getMapProperties(
    req.query.listingType as TListingType | undefined,
  );

  // Public and the same for everyone: let browsers and the CDN cache it.
  res.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Map properties retrieved successfully",
    data: result,
  });
});

const getPropertyStates = catchAsync(async (req, res) => {
  const result = await PropertyServices.getPropertyStates(
    req.query.listingType as TListingType | undefined,
  );

  res.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property states retrieved successfully",
    data: result,
  });
});

export const PropertyControllers = {
  getMapProperties,
  getPropertyStates,
  getAllProperties,
  getAllPropertiesForAdmin,
  getMyProperties,
  createProperty,
  getPropertyById,
  updateProperty,
  deleteProperty,
};
