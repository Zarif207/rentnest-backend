import httpStatus from "http-status";

import prisma from "../../../lib/prisma";
import AppError from "../../utils/AppError";
import { ICreateRentalRequest } from "./rental.interface";

const createRentalRequest = async (
  tenantId: string,
  payload: ICreateRentalRequest
) => {
  const { propertyId, moveInDate, leaseMonths } = payload;

  const property = await prisma.property.findUnique({
    where: {
      id: propertyId,
    },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (property.availabilityStatus !== "AVAILABLE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This property is not available for rent"
    );
  }

  const existingRequest = await prisma.booking.findFirst({
    where: {
      propertyId,
      tenantId,
      bookingStatus: "PENDING",
      isDeleted: false,
    },
  });

  if (existingRequest) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You already have a pending rental request for this property"
    );
  }

  const totalRent = Number(property.rentAmount) * leaseMonths;

  const rentalRequest = await prisma.booking.create({
    data: {
      propertyId,
      tenantId,
      moveInDate: new Date(moveInDate),
      leaseMonths,
      totalRent,
    },
    include: {
      property: true,
    },
  });

  return rentalRequest;
};

const getMyRentalRequests = async (tenantId: string) => {
  const rentalRequests = await prisma.booking.findMany({
    where: {
      tenantId,
      isDeleted: false,
    },
    include: {
      property: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return rentalRequests;
};

const getRentalRequestById = async (
  rentalId: string,
  userId: string
) => {
  const rentalRequest = await prisma.booking.findFirst({
    where: {
      id: rentalId,
      isDeleted: false,
    },
    include: {
      property: true,
      payment: true,
    },
  });

  if (!rentalRequest) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Rental request not found"
    );
  }

  if (
    rentalRequest.tenantId !== userId &&
    rentalRequest.property.ownerId !== userId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to view this rental request"
    );
  }

  return rentalRequest;
};

export const RentalServices = {
  createRentalRequest,
  getMyRentalRequests,
  getRentalRequestById,
};