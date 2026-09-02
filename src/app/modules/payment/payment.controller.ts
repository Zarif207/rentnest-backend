import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PaymentServices } from "./payment.service";

const createPayment = catchAsync(async (req, res) => {
  const result = await PaymentServices.createPayment(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Payment created successfully",
    data: result,
  });
});

const getMyPayments = catchAsync(async (req, res) => {
  const result = await PaymentServices.getMyPayments(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment history retrieved successfully",
    data: result,
  });
});

const getPaymentById = catchAsync(async (req, res) => {
  const result = await PaymentServices.getPaymentById(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment retrieved successfully",
    data: result,
  });
});

const confirmPayment = catchAsync(async (req, res) => {
  const result = await PaymentServices.confirmPayment(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment confirmed successfully",
    data: result,
  });
});

export const PaymentControllers = {
  createPayment,
  getMyPayments,
  getPaymentById,
  confirmPayment,
};
