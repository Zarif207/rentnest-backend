import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma.js";
import { UserServices } from "../user/user.service.js";
import { NotificationServices } from "../notification/notification.service.js";
import AppError from "../../utils/AppError.js";
import httpStatus from "http-status";
import { jwtHelper } from "../../helpers/jwtHelper.js";
import config from "../../../config/index.js";
import { TLoginUser, TRegisterUser } from "./auth.interface.js";

const registerUser = async (payload: TRegisterUser) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (isUserExists) {
    throw new AppError(httpStatus.CONFLICT, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    config.bcrypt_salt_rounds,
  );

  const result = await UserServices.createUser({
    ...payload,
    password: hashedPassword,
    // Landlords wait for admin approval before they can list or manage rentals.
    landlordStatus: payload.role === "LANDLORD" ? "PENDING" : null,
  });

  if (result.role === "LANDLORD") {
    await NotificationServices.notifyAdmins({
      type: "LANDLORD_REGISTERED",
      title: "New landlord to review",
      message: `${result.name} (${result.email}) signed up as a landlord and is waiting for approval.`,
      link: "/dashboard/admin/users?landlordStatus=PENDING",
    });
  }

  const { password, ...userData } = result;

  return userData;
};

const loginUser = async (payload: TLoginUser) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  // Same response for an unknown email and a wrong password, so login
  // doesn't reveal which emails are registered.
  const isPasswordMatched =
    !!user && (await bcrypt.compare(payload.password, user.password));

  if (!user || !isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // Checked only after the password, so it doesn't reveal accounts either.
  if (user.userStatus === "BLOCKED") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account has been blocked. Please contact support.",
    );
  }

  const jwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtHelper.generateToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in,
  );

  const { password, ...userWithoutPassword } = user;

  return {
    accessToken,
    user: userWithoutPassword,
  };
};

export const AuthServices = {
  registerUser,
  loginUser,
};
