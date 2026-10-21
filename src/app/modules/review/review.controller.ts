import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { ReviewServices } from "./review.service.js";
import pick from "../../utils/pick.js";
import { paginationFields } from "../../helpers/paginationHelper.js";

const createReview = catchAsync(async (req, res) => {
  const result = await ReviewServices.createReview(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Review created successfully",
    data: result,
  });
});

const getPropertyReviews = catchAsync(async (req, res) => {
  const result = await ReviewServices.getPropertyReviews(
    req.params.propertyId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property reviews retrieved successfully",
    data: result,
  });
});

const getLandlordReviews = catchAsync(async (req, res) => {
  const result = await ReviewServices.getLandlordReviews(
    req.user.userId,
    req.query.propertyId as string | undefined,
    pick(req.query, paginationFields),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews for your properties retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const ReviewControllers = {
  createReview,
  getPropertyReviews,
  getLandlordReviews,
};
