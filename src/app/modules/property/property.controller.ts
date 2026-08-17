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

export const PropertyControllers = {
  getAllProperties,
};