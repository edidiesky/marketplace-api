import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";
import { UNAUTHORIZED_STATUS_CODE } from "../constants";
import { Permission, RoleLevel } from "../models/User";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies.jwt || req.headers.authorization?.split(" ")[1];
  if (!token) {
    logger.warn("Authentication failed: No token provided", {
      ip: req.ip,
      "user-agent": req.headers["user-agent"],
    });
    res.status(UNAUTHORIZED_STATUS_CODE).json({ error: "Authentication required" });
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
      permissions: Permission[];
      roleLevel?: RoleLevel;
    };

    req.user = {
      userId: decoded.userId,
      role:decoded.role,
      name: decoded.name,
      permissions: decoded.permissions || [],
      roleLevel: decoded.roleLevel,
    };

    logger.info("User authenticated", {
      userId: decoded.userId,
    });
    next();
  } catch (error ) {
    logger.warn("Authentication failed: Invalid token", {
      ip: req.ip,
      "user-agent": req.headers["user-agent"],
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(UNAUTHORIZED_STATUS_CODE).json({ error: "Invalid token" });
    return;
  }
};

export const requirePermissions = (requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.permissions) {
      logger.info("Unauthorized attempt: No permissions in request", {
        ip: req.ip,
        "user-agent": req.headers["user-agent"],
      });
      res.status(UNAUTHORIZED_STATUS_CODE).json({ error: "Unauthorized attempt: Insufficient permissions" });
      return;
    }
 
    const hasPermission = requiredPermissions.every((permission)=> !req.user?.permissions?.includes(permission))

    if (!hasPermission) {
      logger.info("Unauthorized attempt: Insufficient permissions", {
        ip: req.ip,
        "user-agent": req.headers["user-agent"],
        userId: req.user.userId,
        required: requiredPermissions,
        current: req.user.permissions,
        userObject:req.user
      });
      res.status(UNAUTHORIZED_STATUS_CODE).json({
        error: "Unauthorized attempt: Insufficient permissions",
        required: requiredPermissions,
        current: req.user.permissions,
      });
      return;
    }
    next();
  };
};


export const requireMinimumRoleLevel = (minimumLevel: RoleLevel) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.roleLevel) {
      logger.info("Unauthorized attempt: No role level assigned", {
        ip: req.ip,
        "user-agent": req.headers["user-agent"],
      });
      res.status(UNAUTHORIZED_STATUS_CODE).json({ error: "No role level assigned" });
      return;
    }

    if (req.user.roleLevel > minimumLevel) {
      logger.info("Unauthorized attempt: Insufficient role level", {
        ip: req.ip,
        "user-agent": req.headers["user-agent"],
        userId: req.user.userId,
        required: minimumLevel,
        current: req.user.roleLevel,
      });
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




