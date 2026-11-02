import httpStatus from "http-status";
import { NextFunction, Request, Response } from "express";
import config from "../../config/index.js";
import { jwtHelper } from "../helpers/jwtHelper.js";
import AppError from "../utils/AppError.js";
import { OBSERVER_ROLE, READ_METHODS } from "../utils/observer.js";

// Writes an observer may still make: signing in and out.
const ALLOWED_WRITES = ["/auth/login", "/auth/logout"];

/**
 * One global guard (mounted on /api, before the routes): an OBSERVER token
 * may only read. Any other method gets 403 before a route runs. Requests
 * without a valid token pass through; the route's own auth handles them.
 */
const observerReadOnly = (req: Request, res: Response, next: NextFunction) => {
  if (READ_METHODS.includes(req.method) || ALLOWED_WRITES.includes(req.path)) {
    return next();
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();

  let role: unknown;
  try {
    role = jwtHelper.verifyToken(token, config.jwt_access_secret).role;
  } catch {
    return next();
  }

  if (role === OBSERVER_ROLE) {
    return next(
      new AppError(httpStatus.FORBIDDEN, "Observer accounts are read-only"),
    );
  }
  next();
};

export default observerReadOnly;
