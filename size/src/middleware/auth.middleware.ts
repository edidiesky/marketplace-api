import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";
import { UNAUTHORIZED_STATUS_CODE } from "../constants";
import { AuthenticatedRequest, Permission, RoleLevel } from "../types";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];

  if (!token) {
    logger.warn("Authentication failed: No token provided", {
      ip: req.ip,
      "user-agent": req.headers["user-agent"],
    });
    res
      .status(UNAUTHORIZED_STATUS_CODE)
      .json({ error: "Authentication required" });
    return;
  }

  const jwtSecret = process.env.JWT_CODE;
  if (!jwtSecret) {
    logger.error("JWT_CODE environment variable is not set");
    res.status(500).json({ error: "Server configuration error" });
    return;
  }

  try {
    const decoded = (jwt.verify(token, jwtSecret) as AuthenticatedRequest).user;

    (req as AuthenticatedRequest).user = {
      userId: decoded.userId,
      role: decoded.role,
      name: decoded.name,
      permissions: decoded.permissions || [],
      roleLevel: decoded.roleLevel,
    };

    logger.info("User authenticated", {});
    next();
  } catch (error) {
    logger.warn("Authentication failed: Invalid token", {
      ip: req.ip,
      "user-agent": req.headers["user-agent"],
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(UNAUTHORIZED_STATUS_CODE).json({ error: "Invalid token" });
  }
};

// Permission middleware
export const requirePermissions = (requiredPermissions: Permission[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user?.permissions) {
      res.status(UNAUTHORIZED_STATUS_CODE).json({ error: "No permissions" });
      return;
    }

    const hasAll = requiredPermissions.every((p) =>
      req.user!.permissions.includes(p)
    );

    if (!hasAll) {
      res.status(UNAUTHORIZED_STATUS_CODE).json({
        error: "Insufficient permissions",
        required: requiredPermissions,
        current: req.user.permissions,
      });
      return;
    }

    next();
  };
};

export const requireMinimumRoleLevel = (minimumLevel: RoleLevel) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user?.roleLevel) {
      res.status(UNAUTHORIZED_STATUS_CODE).json({ error: "No role level" });
      return;
    }

    if (req.user.roleLevel > minimumLevel) {
      res.status(UNAUTHORIZED_STATUS_CODE).json({
        error: "Insufficient role level",
        required: minimumLevel,
        current: req.user.roleLevel,
      });
      return;
    }

    next();
  };
};
