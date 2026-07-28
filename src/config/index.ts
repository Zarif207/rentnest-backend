import dotenv from "dotenv";
import { SignOptions } from "jsonwebtoken";

dotenv.config();

export default {
  port: process.env.PORT || 4000,
  database_url: process.env.DATABASE_URL as string,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET as string,
  jwt_access_expires_in: (process.env.JWT_ACCESS_EXPIRES_IN ||
    "7d") as SignOptions["expiresIn"],
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET as string,
  jwt_refresh_expires_in: (process.env.JWT_REFRESH_EXPIRES_IN ||
    "30d") as SignOptions["expiresIn"],

  stripe_secret: process.env.STRIPE_SECRET as string,
};
