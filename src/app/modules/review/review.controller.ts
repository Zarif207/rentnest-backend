import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ReviewServices } from "./review.service";

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

export const ReviewControllers = {
  createReview,
  getPropertyReviews,
};
