import { NOT_FOUND_STATUS_CODE, SERVER_ERROR_STATUS_CODE, SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
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
  next: NextFunction
) => {
  const statuscode = res.statusCode === SUCCESSFULLY_FETCHED_STATUS_CODE ? SERVER_ERROR_STATUS_CODE : res.statusCode;
  const errMessage = err.message;
  logger.error("Error message:", errMessage);
  res.status(statuscode);
  res.json({
    message: errMessage,
  });
};

export { errorHandler, NotFound };
