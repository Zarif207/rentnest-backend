import httpStatus from "http-status";
import { ZodError } from "zod";
import { TGenericErrorResponse } from "../interfaces/error.types.js";

// Zod paths look like ["body", "email"]; drop the request section prefix.
const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorDetails = err.issues.map((issue) => {
    const [section, ...rest] = issue.path;
    const isRequestSection = ["body", "params", "query"].includes(
      String(section),
    );
    const path = (isRequestSection ? rest : issue.path).join(".");

    return {
      path: path || String(section ?? ""),
      message: issue.message,
    };
  });

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: "Validation failed",
    errorDetails,
  };
};

export default handleZodError;
