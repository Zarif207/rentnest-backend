import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import prisma from "../../lib/prisma";
import config from "../../config";
import { jwtHelper } from "../helpers/jwtHelper";
import AppError from "../utils/AppError";
import { NextFunction, Request, Response } from "express";

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

      const decoded = jwtHelper.verifyToken(
        token,
        config.jwt_access_secret,
      ) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: {
          id: decoded.userId,
        },
        select: {
          id: true,
          userStatus: true,
        },
      });

      if (!user) {
        throw new AppError(httpStatus.UNAUTHORIZED, "User not found");
      }

      if (user.userStatus === "BLOCKED") {
        throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
      }

      req.user = decoded;

      if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {
        throw new AppError(httpStatus.FORBIDDEN, "Forbidden");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export default auth;
