import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client.js";
import { TGenericErrorResponse } from "../interfaces/error.types.js";
import handleDuplicateError from "./handleDuplicateError.js";

// Maps Prisma known request errors (https://pris.ly/d/prisma-errors) to HTTP errors.
const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError,
): TGenericErrorResponse => {
  switch (err.code) {
    case "P2002":
      return handleDuplicateError(err);

    case "P2003":
      return {
        statusCode: httpStatus.CONFLICT,
        message:
          "This record is referenced by other records and cannot be changed or deleted",
        errorDetails: [
          {
            path: String(err.meta?.field_name ?? ""),
            message: "Foreign key constraint failed",
          },
        ],
      };

    case "P2025":
      return {
        statusCode: httpStatus.NOT_FOUND,
        message: "Requested record not found",
        errorDetails: [
          {
            path: "",
            message: String(err.meta?.cause ?? "Record not found"),
          },
        ],
      };

    case "P2023":
      return {
        statusCode: httpStatus.BAD_REQUEST,
        message: "Invalid ID format",
        errorDetails: [{ path: "id", message: "Malformed identifier" }],
      };

    default:
      return {
        statusCode: httpStatus.BAD_REQUEST,
        message: "Database request failed",
        errorDetails: [{ path: "", message: `Prisma error ${err.code}` }],
      };
  }
};

export default handlePrismaError;
