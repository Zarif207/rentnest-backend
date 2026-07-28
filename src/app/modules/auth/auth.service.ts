import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";
import { UserServices } from "../user/user.service";

const registerUser = async (payload: any) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (isUserExists) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);
  payload.password = hashedPassword;

  const result = await UserServices.createUser(payload);
  const { password, ...userData } = result;

  return userData;
};

export const AuthServices = {
  registerUser,
};
