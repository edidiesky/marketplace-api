import { NOT_FOUND_STATUS_CODE } from "../constants";
import logger from "../utils/logger";
import { Request, Response, NextFunction } from "express";

const NotFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  logger.error("Error message:", error);
  res.status(NOT_FOUND_STATUS_CODE);
  next(error);
};

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = error.statusCode ?? 500;
  const message = error.message ?? "Internal Server Error";

  logger.error("Request failed", {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    error: message,
    stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
  });

  const body: Record<string, any> = {
    status: "error",
    error: message,
  };

  res.status(statusCode).json(body);
}
export { NotFound };
