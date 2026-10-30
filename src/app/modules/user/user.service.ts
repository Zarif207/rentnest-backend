import prisma from "../../../lib/prisma.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import AppError from "../../utils/AppError.js";
import httpStatus from "http-status";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { TPaginationOptions } from "../../interfaces/pagination.js";
import {
  TUpdateLandlordStatus,
  TUpdateMyProfile,
  TUserFilters,
} from "./user.interface.js";
import { userSearchableFields } from "./user.constant.js";
import { NotificationServices } from "../notification/notification.service.js";

const createUser = async (payload: Prisma.UserCreateInput) => {
  const result = await prisma.user.create({
    data: payload,
  });

  return result;
};

const getAllUsers = async (
  filters: TUserFilters,
  options: TPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const { searchTerm, role, userStatus, landlordStatus } = filters;

  const where: Prisma.UserWhereInput = {
    ...(searchTerm
      ? {
          OR: userSearchableFields.map((field) => ({
            [field]: { contains: searchTerm, mode: "insensitive" },
          })),
        }
      : {}),
    ...(role ? { role: role as Prisma.UserWhereInput["role"] } : {}),
    ...(userStatus
      ? { userStatus: userStatus as Prisma.UserWhereInput["userStatus"] }
      : {}),
    ...(landlordStatus
      ? {
          landlordStatus:
            landlordStatus as Prisma.UserWhereInput["landlordStatus"],
        }
      : {}),
  };

  const data = await prisma.user.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      userStatus: true,
      landlordStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const total = await prisma.user.count({ where });

  return {
    meta: paginationHelper.buildMeta(page, limit, total),
    data,
  };
};

const updateUserStatus = async (
  id: string,
  adminId: string,
  payload: { userStatus: "ACTIVE" | "BLOCKED" },
) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (payload.userStatus === "BLOCKED" && id === adminId) {
    throw new AppError(httpStatus.FORBIDDEN, "You cannot block yourself");
  }

  if (payload.userStatus === "BLOCKED" && user.role === "ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Admin accounts cannot be blocked",
    );
  }

  const result = await prisma.user.update({
    where: {
      id,
    },

    data: {
      userStatus: payload.userStatus,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      userStatus: true,
      landlordStatus: true,
      updatedAt: true,
    },
  });

  // Only tell the user when their status actually changed.
  if (user.userStatus !== payload.userStatus) {
    await NotificationServices.notify(
      id,
      payload.userStatus === "BLOCKED"
        ? {
            type: "ACCOUNT_BLOCKED",
            title: "Your account was blocked",
            message:
              "An admin blocked your RentNest account. Contact support if you think this is a mistake.",
          }
        : {
            type: "ACCOUNT_UNBLOCKED",
            title: "Your account was restored",
            message: "An admin unblocked your RentNest account. Welcome back.",
          },
    );
  }

  return result;
};

const updateLandlordStatus = async (
  id: string,
  payload: TUpdateLandlordStatus,
) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      role: true,
    },
  });

  // Only landlords have an approval status.
  if (!user || user.role !== "LANDLORD") {
    throw new AppError(httpStatus.NOT_FOUND, "Landlord not found");
  }

  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      landlordStatus: payload.landlordStatus,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      userStatus: true,
      landlordStatus: true,
      updatedAt: true,
    },
  });

  await NotificationServices.notify(
    id,
    payload.landlordStatus === "APPROVED"
      ? {
          type: "LANDLORD_APPROVED",
          title: "You're approved",
          message:
            "Your landlord account is approved. You can now list properties and manage rental requests.",
          link: "/dashboard/landlord",
        }
      : {
          type: "LANDLORD_REJECTED",
          title: "Landlord application not approved",
          message:
            "Your landlord application was rejected. Contact support if you have questions.",
          link: "/contact",
        },
  );

  return result;
};

// Everything except the password hash.
const profileSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  userStatus: true,
  landlordStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: profileSelect,
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

const updateMyProfile = async (userId: string, payload: TUpdateMyProfile) => {
  if (payload.email) {
    const emailTaken = await prisma.user.findFirst({
      where: {
        email: payload.email,
        NOT: {
          id: userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (emailTaken) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This email is already used by another account",
      );
    }
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: payload,
    select: profileSelect,
  });
};

export const UserServices = {
  createUser,
  getAllUsers,
  updateUserStatus,
  updateLandlordStatus,
  getMyProfile,
  updateMyProfile,
};
