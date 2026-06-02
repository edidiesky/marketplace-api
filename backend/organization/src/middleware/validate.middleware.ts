import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { BAD_REQUEST_STATUS_CODE } from "../constant";

export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(BAD_REQUEST_STATUS_CODE).json({
        success: false,
        message: "Validation failed",
        errors:  error.details.map((d) => ({
          field:   d.path.join("."),
          message: d.message,
        })),
      });
      return;
    }
    next();
  };
}