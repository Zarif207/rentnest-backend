import prisma from "../../../lib/prisma";
import AppError from "../../utils/AppError";
import httpStatus from "http-status";

const createUser = async (payload: any) => {
  const result = await prisma.user.create({
    data: payload,
  });

  return result;
};

const getAllUsers = async () => {
  const result = await prisma.user.findMany({
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

  return result;
};

const updateUserStatus = async (
  id: string,

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

export const UserServices = {
  createUser,
  getAllUsers,
  updateUserStatus,
};
