import { UNAUTHORIZED_STATUS_CODE } from "../constants";
import logger from "../utils/logger";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string };
    }
  }
}

/** AUTHENTICATION MIDDLEWARE */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token =
    req.cookies.jwt ||
    req.headers.authorization?.split(" ")[1];

  if (!token) {
    logger.warn("Authentication failed: No token provided", {
      ip: req.ip,
      "user-agent": req.headers["user-agent"],
    });
    res
      .status(UNAUTHORIZED_STATUS_CODE)
      .json({
        error:
          "You do not have the required access to access this resource. Please make contact with the platform support team!",
      });
    return;
  }

  const jwtSecret = process.env.JWT_CODE;
  if (!jwtSecret) {
    logger.error("JWT_CODE environment variable is not set");
    res.status(500).json({ error: "Server configuration error" });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      role: string;
      name: string;
    };
    req.user = decoded;
    logger.info("User authenticated", {
      userId: decoded.userId,
      role: decoded.role,
    });
    next();
  } catch (error) {
    logger.warn("Authentication failed: Invalid token", {
      ip: req.ip,
      "user-agent": req.headers["user-agent"],
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(UNAUTHORIZED_STATUS_CODE).json({ error: "Invalid token" });
    return;
  }
};
