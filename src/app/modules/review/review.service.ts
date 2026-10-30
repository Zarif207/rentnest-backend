import httpStatus from "http-status";

import prisma from "../../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { TPaginationOptions } from "../../interfaces/pagination.js";
import { ICreateReview } from "./review.interface.js";
import { NotificationServices } from "../notification/notification.service.js";

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

  const eligibleBookings = await prisma.booking.findMany({
    where: {
      propertyId,
      tenantId: userId,
      bookingStatus: { in: ["ACTIVE", "COMPLETED"] },
      isDeleted: false,
    },
    select: {
      id: true,
      review: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  if (eligibleBookings.length === 0) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only review a property after your rental is active",
    );
  }

  // One review per rental (Review.bookingId is unique).
  const bookingToReview = eligibleBookings.find((booking) => !booking.review);

  if (!bookingToReview) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You have already reviewed this rental",
    );
  }

  const review = await prisma.review.create({
    data: {
      bookingId: bookingToReview.id,
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

  await NotificationServices.notify(property.ownerId, {
    type: "REVIEW_RECEIVED",
    title: "New review",
    message: `${review.user.name} rated ${property.title} ${rating}/5.`,
    link: "/dashboard/landlord/reviews",
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
