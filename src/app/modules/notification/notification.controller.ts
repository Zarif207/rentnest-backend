import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import AppError from "../../utils/AppError.js";
import pick from "../../utils/pick.js";
import { paginationFields } from "../../helpers/paginationHelper.js";
import { NotificationServices } from "./notification.service.js";

const getMyNotifications = catchAsync(async (req, res) => {
  const result = await NotificationServices.getMyNotifications(
    req.user.userId,
    pick(req.query, ["unread"]),
    pick(req.query, paginationFields),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid notification ID");
  }

  const result = await NotificationServices.markAsRead(id, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req, res) => {
  const result = await NotificationServices.markAllAsRead(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All notifications marked as read",
    data: result,
  });
});

export const NotificationControllers = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
