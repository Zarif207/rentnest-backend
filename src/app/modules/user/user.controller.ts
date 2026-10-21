import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { UserServices } from "./user.service.js";
import AppError from "../../utils/AppError.js";
import pick from "../../utils/pick.js";
import { paginationFields } from "../../helpers/paginationHelper.js";
import { userFilterableFields } from "./user.constant.js";

const getAllUsers = catchAsync(async (req, res) => {
  const result = await UserServices.getAllUsers(
    pick(req.query, userFilterableFields),
    pick(req.query, paginationFields),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid user ID");
  }

  const result = await UserServices.updateUserStatus(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User status updated successfully",
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const result = await UserServices.updateMyProfile(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

export const UserControllers = {
  getAllUsers,
  updateUserStatus,
  updateMyProfile,
};
