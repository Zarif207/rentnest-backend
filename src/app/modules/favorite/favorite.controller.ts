import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import AppError from "../../utils/AppError.js";
import pick from "../../utils/pick.js";
import { paginationFields } from "../../helpers/paginationHelper.js";
import { FavoriteServices } from "./favorite.service.js";

const getMyFavorites = catchAsync(async (req, res) => {
  const result = await FavoriteServices.getMyFavorites(
    req.user.userId,
    pick(req.query, paginationFields),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Favorites retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyFavoriteIds = catchAsync(async (req, res) => {
  const result = await FavoriteServices.getMyFavoriteIds(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Favorite property IDs retrieved successfully",
    data: result,
  });
});

const addFavorite = catchAsync(async (req, res) => {
  const { favorite, created } = await FavoriteServices.addFavorite(
    req.user.userId,
    req.body.propertyId,
  );

  sendResponse(res, {
    statusCode: created ? httpStatus.CREATED : httpStatus.OK,
    success: true,
    message: created ? "Saved to favorites" : "Already in favorites",
    data: favorite,
  });
});

const removeFavorite = catchAsync(async (req, res) => {
  const { propertyId } = req.params;

  if (!propertyId || Array.isArray(propertyId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid property ID");
  }

  const result = await FavoriteServices.removeFavorite(
    req.user.userId,
    propertyId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.removed ? "Removed from favorites" : "Not in favorites",
    data: result,
  });
});

export const FavoriteControllers = {
  getMyFavorites,
  getMyFavoriteIds,
  addFavorite,
  removeFavorite,
};
