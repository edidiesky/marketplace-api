import { Request, Response, NextFunction } from "express";
import Joi from "joi";
 
type ValidationTarget = "body" | "query" | "params";
export function validate(schema: Joi.Schema, target: ValidationTarget = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
 
    if (error) {
      res.status(400).json({
        status: "error",
        errors: error.details.map((d) => ({ message: d.message })),
      });
      return;
    }
 
    // Write validated + coerced value back so controller gets clean data
    req[target] = value;
    next();
  };
}