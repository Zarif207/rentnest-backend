import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import pick from "../../utils/pick.js";
import { paginationFields } from "../../helpers/paginationHelper.js";
import { OfferServices } from "./offer.service.js";
import { OfferPaymentServices } from "./offerPayment.service.js";
import { TOfferFilters } from "./offer.interface.js";

const createOffer = catchAsync(async (req, res) => {
  const result = await OfferServices.createOffer(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Offer sent successfully",
    data: result,
  });
});

const getMyOffers = catchAsync(async (req, res) => {
  const result = await OfferServices.getMyOffers(
    req.user.userId,
    pick(req.query, ["status"]) as TOfferFilters,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Offers retrieved successfully",
    data: result,
  });
});

const getOfferById = catchAsync(async (req, res) => {
  const result = await OfferServices.getOfferById(
    req.params.id as string,
    req.user.userId,
    req.user.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Offer retrieved successfully",
    data: result,
  });
});

const withdrawOffer = catchAsync(async (req, res) => {
  const result = await OfferServices.withdrawOffer(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Offer withdrawn successfully",
    data: result,
  });
});

const acceptCounter = catchAsync(async (req, res) => {
  const result = await OfferServices.acceptCounter(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Counteroffer accepted successfully",
    data: result,
  });
});

const getLandlordOffers = catchAsync(async (req, res) => {
  const result = await OfferServices.getLandlordOffers(
    req.user.userId,
    pick(req.query, ["status"]) as TOfferFilters,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Offers retrieved successfully",
    data: result,
  });
});

const respondToOffer = catchAsync(async (req, res) => {
  const result = await OfferServices.respondToOffer(
    req.params.id as string,
    req.user.userId,
    req.body,
  );

  const messages = {
    ACCEPT: "Offer accepted successfully",
    REJECT: "Offer rejected successfully",
    COUNTER: "Counteroffer sent successfully",
  } as const;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: messages[req.body.action as keyof typeof messages],
    data: result,
  });
});

const completeSale = catchAsync(async (req, res) => {
  const result = await OfferServices.completeSale(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Sale completed successfully",
    data: result,
  });
});

const getAllOffersForAdmin = catchAsync(async (req, res) => {
  const result = await OfferServices.getAllOffersForAdmin(
    pick(req.query, ["status"]) as TOfferFilters,
    pick(req.query, paginationFields),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All offers retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const createDepositCheckout = catchAsync(async (req, res) => {
  const result = await OfferPaymentServices.createDepositCheckout(
    req.params.id as string,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Deposit checkout session created successfully",
    data: result,
  });
});

const confirmDeposit = catchAsync(async (req, res) => {
  const result = await OfferPaymentServices.confirmDeposit(
    req.user.userId,
    req.body.sessionId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Deposit confirmed successfully",
    data: result,
  });
});

const getMyDeposits = catchAsync(async (req, res) => {
  const result = await OfferPaymentServices.getMyDeposits(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Deposits retrieved successfully",
    data: result,
  });
});

export const OfferControllers = {
  createOffer,
  getMyOffers,
  getOfferById,
  withdrawOffer,
  acceptCounter,
  getLandlordOffers,
  respondToOffer,
  completeSale,
  getAllOffersForAdmin,
  createDepositCheckout,
  confirmDeposit,
  getMyDeposits,
};
