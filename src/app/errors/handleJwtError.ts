import httpStatus from "http-status";
import jwt from "jsonwebtoken";
import { TGenericErrorResponse } from "../interfaces/error.types.js";

// Covers JsonWebTokenError and its subclasses (TokenExpiredError, NotBeforeError).
const handleJwtError = (
  err: InstanceType<typeof jwt.JsonWebTokenError>,
): TGenericErrorResponse => {
  const isExpired = err instanceof jwt.TokenExpiredError;

  return {
    statusCode: httpStatus.UNAUTHORIZED,
    message: isExpired
      ? "Your session has expired, please log in again"
      : "Invalid authentication token",
    errorDetails: [{ path: "authorization", message: err.message }],
  };
};

export default handleJwtError;
