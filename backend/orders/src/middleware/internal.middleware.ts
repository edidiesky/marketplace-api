import logger from "../utils/logger";
import { Request, Response, NextFunction } from "express";

export function internalOnly(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers["x-internal-secret"];
  if (!secret || secret !== process.env.INTERNAL_SERVICE_SECRET) {
    logger.warn("The secret key was not being provided or valid")
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}