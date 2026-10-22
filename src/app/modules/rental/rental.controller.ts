import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import pick from "../../utils/pick.js";
import { paginationFields } from "../../helpers/paginationHelper.js";
import { RentalServices } from "./rental.service.js";
import { TBookingStatus } from "./rental.interface.js";

const createRentalRequest = catchAsync(async (req, res) => {
  const result = await RentalServices.createRentalRequest(
    req.user.userId,
    req.body,
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
    req.user.userId,
    req.query.status as TBookingStatus | undefined,
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
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rental request retrieved successfully",
    data: result,
  });
});

const getLandlordRentalRequests = catchAsync(async (req, res) => {
  const result = await RentalServices.getLandlordRentalRequests(
    req.user.userId,
    req.query.status as TBookingStatus | undefined,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Landlord rental requests retrieved successfully",
    data: result,
  });
});

const updateRentalRequestStatus = catchAsync(async (req, res) => {
  const result = await RentalServices.updateRentalRequestStatus(
    req.params.id as string,
    req.user.userId,
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rental request status updated successfully",
    data: result,
  });
});

const getAllRentalRequestsForAdmin = catchAsync(async (req, res) => {
  const result = await RentalServices.getAllRentalRequestsForAdmin(
    req.query.status as TBookingStatus | undefined,
    pick(req.query, paginationFields),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All rental requests retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const completeRental = catchAsync(async (req, res) => {
  const result = await RentalServices.completeRental(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rental completed successfully",
    data: result,
  });
});

export const RentalControllers = {
  createRentalRequest,
  getMyRentalRequests,
  getRentalRequestById,
  getLandlordRentalRequests,
  updateRentalRequestStatus,
  getAllRentalRequestsForAdmin,
  completeRental,
};
