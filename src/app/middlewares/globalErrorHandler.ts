import { ErrorRequestHandler } from "express";
import httpStatus from "http-status";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { Prisma } from "../../../generated/prisma/client.js";
import handleZodError from "../errors/handleZodError.js";
import handlePrismaError from "../errors/handlePrismaError.js";
import handleValidationError from "../errors/handleValidationError.js";
import handleJwtError from "../errors/handleJwtError.js";
import { TGenericErrorResponse } from "../interfaces/error.types.js";
import AppError from "../utils/AppError.js";

// Express identifies error middleware by its four parameters, so _req and _next stay.
const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let response: TGenericErrorResponse = {
    statusCode: httpStatus.INTERNAL_SERVER_ERROR,
    message: "Something went wrong",
    errorDetails: [{ path: "", message: "Internal server error" }],
  };

  if (err instanceof ZodError) {
    response = handleZodError(err);
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    response = handlePrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    response = handleValidationError(err);
  } else if (err instanceof jwt.JsonWebTokenError) {
    response = handleJwtError(err);
  } else if (err instanceof AppError) {
    response = {
      statusCode: err.statusCode,
      message: err.message,
      errorDetails: [{ path: "", message: err.message }],
    };
  } else if (err?.type === "entity.parse.failed") {
    // Malformed JSON body from express.json()
    response = {
      statusCode: httpStatus.BAD_REQUEST,
      message: "Malformed JSON in request body",
      errorDetails: [{ path: "body", message: err.message }],
    };
  } else if (err instanceof Error && process.env.NODE_ENV !== "production") {
    // Unexpected errors keep a generic message; details only outside production.
    response.errorDetails = [{ path: "", message: err.message }];
  }

  if (response.statusCode >= 500) {
    console.error(err);
  }

  res.status(response.statusCode).json({
    success: false,
    message: response.message,
    errorDetails: response.errorDetails,
  });
};

export default globalErrorHandler;
