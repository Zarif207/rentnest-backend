import prisma from "../../../lib/prisma";

const createUser = async (payload: any) => {
  const result = await prisma.user.create({
    data: payload,
  });

  return result;
};

export const UserServices = {
  createUser,
};
