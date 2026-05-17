export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
  static badRequest(message: string, details?: any): AppError {
    return new AppError(message, 400, true, details);
  }

  static unauthorized(message: string = "Unauthorized"): AppError {
    return new AppError(message, 401, true);
  }

  static forbidden(message: string = "Forbidden"): AppError {
    return new AppError(message, 403, true);
  }

  static notFound(message: string = "Resource not found"): AppError {
    return new AppError(message, 404, true);
  }

  static conflict(message: string, details?: any): AppError {
    return new AppError(message, 409, true, details);
  }

  static internal(message: string = "Internal server error"): AppError {
    return new AppError(message, 500, false);
  }
}

