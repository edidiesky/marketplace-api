import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import redisClient from "../config/redis";
import { AppError } from "../utils/AppError";
import { requestContext } from "../context/requestContext";
import { AuthenticatedRequest } from "./contextMiddleware";
import { JWTPayload } from "../types";

export function authenticate(
  req:  Request,
  res:  Response,
  next: NextFunction
): void {
  const token =
    req.cookies?.jwt ??
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    const err = AppError.unauthorized("No authentication token provided.");
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  let decoded: { user: JWTPayload; exp: number };

  try {
    decoded = jwt.verify(token, process.env.JWT_CODE!) as {
      user: JWTPayload;
      exp:  number;
    };
  } catch {
    const err = AppError.unauthorized("Invalid or expired authentication token.");
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  const { userId } = decoded.user;

  redisClient
    .get(`blocklist:${userId}`)
    .then((blocked) => {
      if (blocked) {
        const err = AppError.unauthorized(
          "Session has been invalidated. Please log in again."
        );
        res.status(err.statusCode).json({ success: false, message: err.message });
        return;
      }
      (req as AuthenticatedRequest).user = {
        userId:         decoded.user.userId,
        userType:       decoded.user.userType,
        organizationId: decoded.user.organizationId,
      };
      requestContext.set({
        userId:         decoded.user.userId,
        organizationId: decoded.user.organizationId,
      });
      next();
    })
    .catch(() => {
      (req as AuthenticatedRequest).user = {
        userId:         decoded.user.userId,
        userType:       decoded.user.userType,
        organizationId: decoded.user.organizationId,
      };
      next();
    });
}