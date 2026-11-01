import { NextFunction, Request, Response } from "express";
import config from "../../config/index.js";
import { jwtHelper } from "../helpers/jwtHelper.js";

// For public routes that show more to a signed-in owner or admin (e.g. a
// listing still under review). A valid token sets req.user; a missing,
// invalid or expired one leaves the request anonymous instead of failing it.
// Only the signature is checked (no database call), so a blocked user is
// treated by role here; the protected routes still check status.
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      req.user = jwtHelper.verifyToken(token, config.jwt_access_secret);
    } catch {
      // Anonymous.
    }
  }

  next();
};

export default optionalAuth;
