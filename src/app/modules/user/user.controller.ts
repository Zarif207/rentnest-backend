import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserServices } from "./user.service";
import AppError from "../../utils/AppError";

const getAllUsers = catchAsync(async (req, res) => {
  const result = await UserServices.getAllUsers();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    data: result,
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

export const UserControllers = {
  getAllUsers,
  updateUserStatus,
};
