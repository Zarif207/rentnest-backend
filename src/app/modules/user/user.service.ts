import prisma from "../../../lib/prisma.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import AppError from "../../utils/AppError.js";
import httpStatus from "http-status";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { TPaginationOptions } from "../../interfaces/pagination.js";
import { TUpdateMyProfile, TUserFilters } from "./user.interface.js";
import { userSearchableFields } from "./user.constant.js";

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
  const { searchTerm, role, userStatus } = filters;

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
      updatedAt: true,
    },
  });

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
  getMyProfile,
  updateMyProfile,
};
