import httpStatus from "http-status";
import { NextFunction, Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import AppError from "../utils/AppError.js";

// Use after auth("LANDLORD") on landlord write actions. Read routes stay open,
// so a pending landlord can still browse their dashboard.
const requireApprovedLandlord = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
      select: {
        landlordStatus: true,
      },
    });

    if (!user) {
      throw new AppError(httpStatus.UNAUTHORIZED, "User not found");
    }

    if (user.landlordStatus === "PENDING") {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Your landlord account is waiting for admin approval",
      );
    }

    if (user.landlordStatus === "REJECTED") {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Your landlord application was rejected. Contact support.",
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default requireApprovedLandlord;
