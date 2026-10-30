import httpStatus from "http-status";

import prisma from "../../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { TPaginationOptions } from "../../interfaces/pagination.js";
import { ICreateRentalRequest, TBookingStatus } from "./rental.interface.js";
import { NotificationServices } from "../notification/notification.service.js";

const createRentalRequest = async (
  tenantId: string,
  payload: ICreateRentalRequest,
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
      "This property is not available for rent",
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
      "You already have a pending rental request for this property",
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
      tenant: {
        select: {
          name: true,
        },
      },
    },
  });

  await NotificationServices.notify(property.ownerId, {
    type: "RENTAL_REQUESTED",
    title: "New rental request",
    message: `${rentalRequest.tenant.name} wants to rent ${property.title} for ${leaseMonths} ${leaseMonths === 1 ? "month" : "months"}.`,
    link: "/dashboard/landlord/requests",
  });

  return rentalRequest;
};

const getMyRentalRequests = async (
  tenantId: string,
  status?: TBookingStatus,
) => {
  const rentalRequests = await prisma.booking.findMany({
    where: {
      tenantId,
      isDeleted: false,
      ...(status ? { bookingStatus: status } : {}),
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

const getRentalRequestById = async (rentalId: string, userId: string) => {
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
    throw new AppError(httpStatus.NOT_FOUND, "Rental request not found");
  }

  if (
    rentalRequest.tenantId !== userId &&
    rentalRequest.property.ownerId !== userId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to view this rental request",
    );
  }

  return rentalRequest;
};

const getLandlordRentalRequests = async (
  landlordId: string,
  status?: TBookingStatus,
) => {
  const rentalRequests = await prisma.booking.findMany({
    where: {
      isDeleted: false,
      ...(status ? { bookingStatus: status } : {}),
      property: {
        ownerId: landlordId,
      },
    },
    include: {
      property: true,
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return rentalRequests;
};

const getAllRentalRequestsForAdmin = async (
  status: TBookingStatus | undefined,
  options: TPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const where = {
    isDeleted: false,
    ...(status ? { bookingStatus: status } : {}),
  };

  const rentalRequests = await prisma.booking.findMany({
    where,
    skip,
    take: limit,
    include: {
      property: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      payment: true,
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  const total = await prisma.booking.count({ where });

  return {
    meta: paginationHelper.buildMeta(page, limit, total),
    data: rentalRequests,
  };
};

const updateRentalRequestStatus = async (
  rentalId: string,
  landlordId: string,
  status: "APPROVED" | "REJECTED",
) => {
  const rentalRequest = await prisma.booking.findFirst({
    where: {
      id: rentalId,
      isDeleted: false,
      property: {
        ownerId: landlordId,
      },
    },
    include: {
      property: true,
    },
  });

  if (!rentalRequest) {
    throw new AppError(httpStatus.NOT_FOUND, "Rental request not found");
  }

  if (rentalRequest.bookingStatus !== "PENDING") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only pending rental requests can be approved or rejected",
    );
  }

  // Additional checks are required only when approving a rental.
  if (status === "APPROVED") {
    if (rentalRequest.property.availabilityStatus !== "AVAILABLE") {
      throw new AppError(
        httpStatus.CONFLICT,
        "This property is already rented or unavailable",
      );
    }

    // Prevent another rental for this property from already
    // being approved or actively rented.
    const existingRental = await prisma.booking.findFirst({
      where: {
        propertyId: rentalRequest.propertyId,
        id: {
          not: rentalId,
        },
        isDeleted: false,
        bookingStatus: {
          in: ["APPROVED", "ACTIVE"],
        },
      },
    });

    if (existingRental) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Another rental for this property has already been approved or is active",
      );
    }
  }

  const updatedRequest = await prisma.booking.update({
    where: {
      id: rentalId,
    },
    data: {
      bookingStatus: status,
    },
    include: {
      property: true,
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  await NotificationServices.notify(
    updatedRequest.tenantId,
    status === "APPROVED"
      ? {
          type: "RENTAL_APPROVED",
          title: "Request approved",
          message: `Your request for ${updatedRequest.property.title} was approved. Pay to secure your rental.`,
          link: `/dashboard/tenant/requests/${updatedRequest.id}/pay`,
        }
      : {
          type: "RENTAL_REJECTED",
          title: "Request declined",
          message: `Your request for ${updatedRequest.property.title} was declined by the landlord.`,
          link: "/dashboard/tenant/requests",
        },
  );

  return updatedRequest;
};

const completeRental = async (rentalId: string, landlordId: string) => {
  const rentalRequest = await prisma.booking.findFirst({
    where: {
      id: rentalId,
      isDeleted: false,
      property: {
        ownerId: landlordId,
      },
    },
    include: {
      payment: true,
    },
  });

  if (!rentalRequest) {
    throw new AppError(httpStatus.NOT_FOUND, "Rental request not found");
  }

  if (rentalRequest.bookingStatus !== "ACTIVE") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only active rentals can be completed",
    );
  }

  if (rentalRequest.payment?.paymentStatus !== "PAID") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Rental must be paid before it can be completed",
    );
  }

  // A landlord may complete an active rental at any time (e.g. early
  // move-out). The property becomes available again in the same transaction.
  const completedRental = await prisma.$transaction(async (tx) => {
    const { count } = await tx.booking.updateMany({
      where: {
        id: rentalId,
        bookingStatus: "ACTIVE",
      },
      data: {
        bookingStatus: "COMPLETED",
      },
    });

    if (count === 0) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This rental has already been completed",
      );
    }

    await tx.property.update({
      where: {
        id: rentalRequest.propertyId,
      },
      data: {
        availabilityStatus: "AVAILABLE",
      },
    });

    return tx.booking.findUniqueOrThrow({
      where: {
        id: rentalId,
      },
      include: {
        property: true,
        payment: true,
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  });

  await NotificationServices.notify(completedRental.tenantId, {
    type: "RENTAL_COMPLETED",
    title: "Rental completed",
    message: `Your rental of ${completedRental.property.title} is complete. Tell others how it went with a review.`,
    link: "/dashboard/tenant/requests",
  });

  return completedRental;
};

export const RentalServices = {
  createRentalRequest,
  getMyRentalRequests,
  getRentalRequestById,
  getLandlordRentalRequests,
  getAllRentalRequestsForAdmin,
  updateRentalRequestStatus,
  completeRental,
};
