import httpStatus from "http-status";
import prisma from "../../lib/prisma.js";
import config from "../../config/index.js";
import { jwtHelper } from "../helpers/jwtHelper.js";
import AppError from "../utils/AppError.js";
import { OBSERVER_ROLE, READ_METHODS } from "../utils/observer.js";
import { NextFunction, Request, Response } from "express";

// An observer may read anything an admin or a landlord can read.
const observerMayRead = (req: Request, requiredRoles: string[]) =>
  READ_METHODS.includes(req.method) &&
  (requiredRoles.includes("ADMIN") || requiredRoles.includes("LANDLORD"));

const auth = (...requiredRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authorizationToken = req.headers.authorization;

      if (!authorizationToken) {
        throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
      }

      const token = authorizationToken.split(" ")[1];

      if (!token) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Invalid authorization token",
        );
      }

      const decoded = jwtHelper.verifyToken(token, config.jwt_access_secret);

      const user = await prisma.user.findUnique({
        where: {
          id: decoded.userId,
        },
        select: {
          id: true,
          role: true,
          userStatus: true,
        },
      });

      if (!user) {
        throw new AppError(httpStatus.UNAUTHORIZED, "User not found");
      }

      if (user.userStatus === "BLOCKED") {
        throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
      }

      // The role comes from the database, not the token, so a changed role
      // takes effect without waiting for the token to expire.
      req.user = { ...decoded, role: user.role };

      if (
        requiredRoles.length &&
        !requiredRoles.includes(user.role) &&
        !(user.role === OBSERVER_ROLE && observerMayRead(req, requiredRoles))
      ) {
        throw new AppError(httpStatus.FORBIDDEN, "Forbidden");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export default auth;
