import logger from "../utils/logger";
import { Request, Response, NextFunction } from "express";

const NotFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  logger.error("Error message:", error);
  res.status(404);
  next(error);
};

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statuscode = res.statusCode === 200 ? 500 : res.statusCode;
  const errMessage = err.message;
  logger.error("Error message:", errMessage);
  res.status(statuscode);
  res.json({
    message: errMessage,
  });
};

export { errorHandler, NotFound };
