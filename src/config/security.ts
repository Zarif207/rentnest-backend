import config from "./index.js";

const MIN_SECRET_LENGTH = 32;

/**
 * Fails fast at startup when the JWT secret is missing or too short to be
 * safe for HS256. The message names the variable, never the value.
 */
export const assertSecurityConfig = () => {
  const secrets = { JWT_ACCESS_SECRET: config.jwt_access_secret };
  for (const [name, value] of Object.entries(secrets)) {
    if (!value || value.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `${name} is ${value ? "too short" : "missing"}: set it to a random string of at least ${MIN_SECRET_LENGTH} characters.`,
      );
    }
  }
};

/** Browser origins allowed by CORS, from CORS_ORIGINS (comma-separated). */
export const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
