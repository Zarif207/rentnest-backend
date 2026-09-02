import httpStatus from "http-status";
import prisma from "../../../lib/prisma";
import AppError from "../../utils/AppError";
import { ICreatePayment } from "./payment.interface";

const createPayment = async (tenantId: string, payload: ICreatePayment) => {
  const { bookingId, transactionId, amount, paymentMethod } = payload;

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      payment: true,
    },
  });

  if (!booking || booking.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Rental booking not found");
  }

  if (booking.tenantId !== tenantId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to make payment for this booking",
    );
  }

  if (booking.bookingStatus !== "APPROVED") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment can only be made for an approved rental",
    );
  }

  if (booking.payment) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Payment has already been created for this rental",
    );
  }

  if (Number(booking.totalRent) !== amount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment amount does not match the rental amount",
    );
  }

  const existingTransaction = await prisma.payment.findUnique({
    where: {
      transactionId,
    },
  });

  if (existingTransaction) {
    throw new AppError(httpStatus.CONFLICT, "Transaction ID already exists");
  }

  const payment = await prisma.payment.create({
    data: {
      bookingId,
      transactionId,
      amount,
      paymentMethod,
      paymentStatus: "PENDING",
    },
    include: {
      booking: {
        include: {
          property: true,
        },
      },
    },
  });

  return payment;
};

const getMyPayments = async (tenantId: string) => {
  const payments = await prisma.payment.findMany({
    where: {
      booking: {
        tenantId,
        isDeleted: false,
      },
    },
    include: {
      booking: {
        include: {
          property: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return payments;
};

const getPaymentById = async (paymentId: string, tenantId: string) => {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      booking: {
        include: {
          property: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  if (payment.booking.tenantId !== tenantId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to view this payment",
    );
  }

  return payment;
};

const confirmPayment = async (paymentId: string, tenantId: string) => {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      booking: true,
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  if (payment.booking.tenantId !== tenantId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to confirm this payment",
    );
  }

  if (payment.paymentStatus === "PAID") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment has already been confirmed",
    );
  }

  if (payment.paymentStatus === "FAILED") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Failed payment cannot be confirmed",
    );
  }

  const confirmedPayment = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        paymentStatus: "PAID",
        paymentDate: new Date(),
      },
    });

    await tx.property.update({
      where: {
        id: payment.booking.propertyId,
      },
      data: {
        availabilityStatus: "RENTED",
      },
    });

    return updatedPayment;
  });

  const result = await prisma.payment.findUnique({
    where: {
      id: confirmedPayment.id,
    },
    include: {
      booking: {
        include: {
          property: true,
        },
      },
    },
  });

  return result;
};

export const PaymentServices = {
  createPayment,
  getMyPayments,
  getPaymentById,
  confirmPayment,
};
