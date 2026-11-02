import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";

const generateToken = (
  payload: object,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"],
) => {
  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn,
  });
};

const verifyToken = (token: string, secret: Secret) => {
  // Only HS256 is accepted, so a token can't pick a weaker algorithm.
  return jwt.verify(token, secret, { algorithms: ["HS256"] }) as JwtPayload;
};

export const jwtHelper = {
  generateToken,
  verifyToken,
};
