import httpStatus from "http-status";

import prisma from "../../../lib/prisma";
import AppError from "../../utils/AppError";
import { ICreateReview } from "./review.interface";

const createReview = async (
  userId: string,
  payload: ICreateReview,
) => {
  const { propertyId, rating, comment } = payload;

  const property = await prisma.property.findUnique({
    where: {
      id: propertyId,
    },
  });

  if (!property) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Property not found",
    );
  }

  const approvedBooking = await prisma.booking.findFirst({
    where: {
      propertyId,
      tenantId: userId,
      bookingStatus: "APPROVED",
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

export const ReviewServices = {
  createReview,
};