import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client.js";
import { TGenericErrorResponse } from "../interfaces/error.types.js";

// Prisma P2002: unique constraint violation.
const handleDuplicateError = (
  err: Prisma.PrismaClientKnownRequestError,
): TGenericErrorResponse => {
  const target = err.meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [];

  return {
    statusCode: httpStatus.CONFLICT,
    message: fields.length
      ? `A record with this ${fields.join(", ")} already exists`
      : "A record with these values already exists",
    errorDetails: (fields.length ? fields : [""]).map((field) => ({
      path: field,
      message: "Value must be unique",
    })),
  };
};

export default handleDuplicateError;
