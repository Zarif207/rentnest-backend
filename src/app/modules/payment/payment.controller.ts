import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { PaymentServices } from "./payment.service";



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

const createStripeCheckoutSession = catchAsync(async (req, res) => {
  const result = await PaymentServices.createStripeCheckoutSession(
    req.user.userId,
    req.body.bookingId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stripe checkout session created successfully",
    data: result,
  });
});

const handleStripeWebhook = catchAsync(async (req, res) => {
  await PaymentServices.handleStripeWebhook(req.body, req.headers["stripe-signature"] as string);

  res.status(httpStatus.OK).json({
    received: true,
  });
});

export const PaymentControllers = {
  getMyPayments,
  getPaymentById,
  createStripeCheckoutSession,
  handleStripeWebhook,
};
