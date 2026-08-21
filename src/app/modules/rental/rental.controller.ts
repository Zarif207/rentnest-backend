import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { RentalServices } from "./rental.service";

const createRentalRequest = catchAsync(async (req, res) => {
  const result = await RentalServices.createRentalRequest(
    req.user.userId,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Rental request submitted successfully",
    data: result,
  });
});

const getMyRentalRequests = catchAsync(async (req, res) => {
  const result = await RentalServices.getMyRentalRequests(
    req.user.userId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rental requests retrieved successfully",
    data: result,
  });
});

const getRentalRequestById = catchAsync(async (req, res) => {
  const result = await RentalServices.getRentalRequestById(
    req.params.id as string,
    req.user.userId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rental request retrieved successfully",
    data: result,
  });
});

export const RentalControllers = {
  createRentalRequest,
  getMyRentalRequests,
  getRentalRequestById,
};