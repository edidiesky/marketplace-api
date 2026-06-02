import { Request, Response, NextFunction } from "express";

export const bypass2FAMiddleware = (
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next();
};