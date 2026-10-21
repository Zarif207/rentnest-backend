import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client.js";
import { TGenericErrorResponse } from "../interfaces/error.types.js";

// Prisma rejected the query shape (wrong type, missing field, etc.).
// The raw message exposes query internals, so only a generic message is returned.
const handleValidationError = (
  _err: Prisma.PrismaClientValidationError,
): TGenericErrorResponse => {
  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: "Invalid data provided",
    errorDetails: [
      {
        path: "",
        message: "The request contains invalid or missing values",
      },
    ],
  };
};

export default handleValidationError;
