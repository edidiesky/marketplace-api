export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, true, details);
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(message, 401, true);
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError(message, 403, true);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(message, 404, true);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, 409, true, details);
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError(message, 500, false);
  }
}