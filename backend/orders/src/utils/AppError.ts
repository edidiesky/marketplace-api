export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public failedItems?: Array<{
    productId: string;
    productTitle: string;
    reason: string;
  }>;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string): AppError {
    return new AppError(message, 400, true);
  }

  static unauthorized(message: string): AppError {
    return new AppError(message, 401, true);
  }

  static forbidden(message: string): AppError {
    return new AppError(message, 403, true);
  }

  static notFound(message: string): AppError {
    return new AppError(message, 404, true);
  }

  static serviceUnavailable(message: string): AppError {
    return new AppError(message, 503, true);
  }

  static internal(message: string): AppError {
    return new AppError(message, 500, false);
  }
}