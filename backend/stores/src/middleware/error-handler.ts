import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = err;
  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    error = new AppError(
      message,
      statusCode,
      false, 
      { originalError: err.message, stack: err.stack }
    );
  }

  if (error.isOperational) {
    logger.warn(`Operational error: ${error.message}`, {
      statusCode: error.statusCode,
      path: req.path,
      method: req.method,
      details: error.details,
    });
  } else {
    logger.error("Unexpected server error", {
      error: error.message,
      path: req.path,
      method: req.method,
    });
  }

  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

export const NotFound = (req: Request, res: Response, next: NextFunction) => {
  next(AppError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
};
  