import { Response } from "express";
import { TMeta } from "../interfaces/pagination.js";

type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string;
  meta?: TMeta;
  data?: T;
};

const sendResponse = <T>(res: Response, data: TResponse<T>) => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    ...(data.meta ? { meta: data.meta } : {}),
    data: data.data,
  });
};

export default sendResponse;
