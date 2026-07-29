import prisma from "../../../lib/prisma";

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

export const UserServices = {
  createUser,
  getAllUsers,
};
