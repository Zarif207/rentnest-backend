import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues,
      });
    }

    const validatedData = result.data as {
      body: unknown;
      params: unknown;
      query: unknown;
    };

    req.body = validatedData.body;
    req.params = validatedData.params as Request["params"];

    next();
  };
};

export default validateRequest;
