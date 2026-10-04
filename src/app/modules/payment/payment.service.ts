import httpStatus from "http-status";
import prisma from "../../../lib/prisma";
import AppError from "../../utils/AppError";
import { ICreatePayment } from "./payment.interface";
import stripe from "../../../config/stripe";
import Stripe from "stripe";
import config from "../../../config";



const createStripeCheckoutSession = async (
  tenantId: string,
  bookingId: string,
) => {
  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      payment: true,
      property: true,
    },
  });

  if (!booking || booking.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Rental booking not found");
  }

  if (booking.tenantId !== tenantId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to pay for this booking",
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

  const amount = Number(booking.totalRent);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `RentNest - ${booking.property.title}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],

    metadata: {
      bookingId: booking.id,
      tenantId: booking.tenantId,
    },

    success_url:
      "http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}",

    cancel_url: "http://localhost:3000/payment/cancel",
  });

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      transactionId: session.id,
      amount,
      paymentMethod: "STRIPE",
      paymentStatus: "PENDING",
    },
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    paymentId: payment.id,
  };
};

const handleStripeWebhook = async (payload: Buffer, signature: string) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe_webhook_secret
    );
  } catch (error) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid Stripe webhook signature",
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return null;
    }

    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Booking ID missing from Stripe session",
      );
    }

    const payment = await prisma.payment.findUnique({
      where: {
        bookingId,
      },
      include: {
        booking: true,
      },
    });

    if (!payment) {
      throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
    }

    if (payment.paymentStatus === "PAID") {
      return payment;
    }

    const confirmedPayment = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: {
          id: payment.id,
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

    return confirmedPayment;
  }

  return null;
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

export const PaymentServices = {
  createStripeCheckoutSession,
  handleStripeWebhook,
  getMyPayments,
  getPaymentById,
};
