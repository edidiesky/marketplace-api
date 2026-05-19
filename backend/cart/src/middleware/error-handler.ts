import { Request, Response, NextFunction } from "express";
import { Error as MongooseError }          from "mongoose";
import { AppError }                        from "../utils/AppError";
import logger                              from "../utils/logger";

interface MongoServerError {
  code?:     number;
  keyValue?: Record<string, unknown>;
}

function handleMongooseCastError(
  err: MongooseError.CastError
): AppError {
  return AppError.badRequest(
    `Invalid value for field "${err.path}": ${err.value}`
  );
}

function handleMongooseDuplicateKey(
  err: MongoServerError
): AppError {
  const field  = err.keyValue ? Object.keys(err.keyValue)[0] : "field";
  const value  = err.keyValue ? Object.values(err.keyValue)[0] : "";
  return AppError.conflict(
    `${field} "${value}" already exists.`
  );
}

function handleMongooseValidationError(
  err: MongooseError.ValidationError
): AppError {
  const messages = Object.values(err.errors)
    .map((e) => e.message)
    .join(", ");
  return AppError.badRequest(`Validation failed: ${messages}`);
}

function handleJoiValidationError(
  err: { isJoi: boolean; details: Array<{ message: string }> }
): AppError {
  const messages = err.details.map((d) => d.message.replace(/"/g, "")).join(", ");
  return AppError.badRequest(messages);
}

function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof MongooseError.CastError) {
    return handleMongooseCastError(err);
  }

  if (err instanceof MongooseError.ValidationError) {
    return handleMongooseValidationError(err);
  }

  const mongoErr = err as MongoServerError;
  if (mongoErr.code === 11000) {
    return handleMongooseDuplicateKey(mongoErr);
  }

  const joiErr = err as { isJoi?: boolean; details?: Array<{ message: string }> };
  if (joiErr.isJoi === true && Array.isArray(joiErr.details)) {
    return handleJoiValidationError(
      err as { isJoi: boolean; details: Array<{ message: string }> }
    );
  }

  const anyErr = err as { statusCode?: number; message?: string; stack?: string };
  const statusCode = anyErr.statusCode ?? 500;
  const message    = anyErr.message    ?? "An unexpected error occurred.";

  return new AppError(message, statusCode, false, {
    originalError: anyErr.message,
    stack:         anyErr.stack,
  });
}

export function errorHandler(
  err:  unknown,
  req:  Request,
  res:  Response,
  next: NextFunction
): void {
  const error = normalizeError(err);

  if (error.isOperational) {
    logger.warn("operational_error", {
      event:      "operational_error",
      statusCode: error.statusCode,
      message:    error.message,
      path:       req.path,
      method:     req.method,
      requestId:  req.headers["x-request-id"] as string,
      details:    error.details,
    });
  } else {
    logger.error("unexpected_server_error", {
      event:     "unexpected_server_error",
      message:   error.message,
      path:      req.path,
      method:    req.method,
      requestId: req.headers["x-request-id"] as string,
      stack:     error.stack,
    });
  }

  const body: Record<string, unknown> = {
    success: false,
    message: error.message,
  };

  if (error.details) {
    body["details"] = error.details;
  }

  if (process.env.NODE_ENV === "development") {
    body["stack"] = error.stack;
  }

  res.status(error.statusCode).json(body);
}

export function NotFound(
  req:  Request,
  res:  Response,
  next: NextFunction
): void {
  next(AppError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}