import { NOT_FOUND_STATUS_CODE } from "../constants";
import logger from "../utils/logger";
import { Request, Response, NextFunction } from "express";

const NotFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  logger.error("Error message:", error);
  res.status(NOT_FOUND_STATUS_CODE);
  next(error);
};

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const statuscode = res.statusCode;
  const errMessage = err instanceof Error ? err.message : String(err);
  logger.error("Request failed", {
    method: req.method,
    url: req.originalUrl,
    statuscode,
    error: errMessage,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });
  res.status(statuscode).json({
    error: errMessage,
    success: false,
  });
};

export { errorHandler, NotFound };
