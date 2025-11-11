import { BAD_REQUEST_STATUS_CODE } from "../constants";
import { Request, Response, NextFunction } from "express";
import { Schema } from "joi";

/**
 * 
 * @description Validation Middleware
 * @returns 
 */
export const validateRequest = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    if (error) {
      res.status(BAD_REQUEST_STATUS_CODE).json({ error: error.details[0].message });
      return;
    }
    next();
  };
};


