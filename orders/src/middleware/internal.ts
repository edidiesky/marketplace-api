
import { Request, Response, NextFunction } from "express";
import { authenticate } from "./auth.middleware";

const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET ?? "";

export function authenticateOrInternal(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const internalSecret = req.headers["x-internal-secret"];
  if (internalSecret && internalSecret === INTERNAL_SECRET) {
    next();
    return;
  }
  authenticate(req, res, next);
}