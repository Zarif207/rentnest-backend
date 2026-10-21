import httpStatus from "http-status";

import prisma from "../../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { TPaginationOptions } from "../../interfaces/pagination.js";
import { ICreateReview } from "./review.interface.js";

const createReview = async (userId: string, payload: ICreateReview) => {
  const { propertyId, rating, comment } = payload;

  const property = await prisma.property.findUnique({
    where: {
      id: propertyId,
    },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  const approvedBooking = await prisma.booking.findFirst({
    where: {
      propertyId,
      tenantId: userId,
      bookingStatus: "COMPLETED",
      isDeleted: false,
    },
  });

  if (!approvedBooking) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only review a property you have rented",
    );
  }

  const existingReview = await prisma.review.findFirst({
    where: {
      propertyId,
      userId,
    },
  });

  if (existingReview) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You have already reviewed this property",
    );
  }

  const review = await prisma.review.create({
    data: {
      propertyId,
      userId,
      rating,
      comment,
    },
    include: {
      property: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return review;
};

const getPropertyReviews = async (propertyId: string) => {
  const property = await prisma.property.findUnique({
    where: {
      id: propertyId,
    },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  const reviews = await prisma.review.findMany({
    where: {
      propertyId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return reviews;
};

const getLandlordReviews = async (
  landlordId: string,
  propertyId: string | undefined,
  options: TPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const where = {
    property: {
      ownerId: landlordId,
    },
    ...(propertyId ? { propertyId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    meta: paginationHelper.buildMeta(page, limit, total),
    data,
  };
};

export const ReviewServices = {
  createReview,
  getPropertyReviews,
  getLandlordReviews,
};
