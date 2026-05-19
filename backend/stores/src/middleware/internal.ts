import { Request, Response, NextFunction } from "express";

const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET ?? "";

export function internalOnly(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret = req.headers["x-internal-secret"];
  if (secret && secret === INTERNAL_SECRET) {
    next();
    return;
  }
  res.status(403).json({ status: "error", message: "Forbidden" });
}