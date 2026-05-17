import { Request, Response, NextFunction } from "express";
import { UNAUTHORIZED_STATUS_CODE }        from "../constants";
import logger                              from "../utils/logger";
import { SERVICE_NAME }                    from "../constants";

export function internalOnly(
  req:  Request,
  res:  Response,
  next: NextFunction
): void {
  const secret = req.headers["x-internal-secret"];

  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    logger.warn("internal_middleware_unauthorized", {
      event:   "internal_middleware_unauthorized",
      service: SERVICE_NAME,
      path:    req.path,
      ip:      req.ip,
    });
    res.status(UNAUTHORIZED_STATUS_CODE).json({
      success: false,
      message: "Unauthorized.",
    });
    return;
  }

  next();
}