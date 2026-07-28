import { Request, Response } from "express";
import { AuthServices } from "./auth.service";

const registerUser = async (req: Request, res: Response) => {
  const result = await AuthServices.registerUser(req.body);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: result,
  });
};

export const AuthControllers = {
  registerUser,
};
