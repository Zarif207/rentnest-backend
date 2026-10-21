import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

const validateRequest = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    // Let the global error handler format Zod errors like every other error.
    if (!result.success) {
      return next(result.error);
    }

    const validatedData = result.data as {
      body?: unknown;
      params?: unknown;
      query?: unknown;
    };

    if (validatedData.body !== undefined) {
      req.body = validatedData.body;
    }

    if (validatedData.params !== undefined) {
      req.params = validatedData.params as Request["params"];
    }

    // req.query is a getter in Express 5, so redefine it to expose coerced values.
    if (validatedData.query !== undefined) {
      Object.defineProperty(req, "query", {
        value: validatedData.query,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    next();
  };
};

export default validateRequest;
