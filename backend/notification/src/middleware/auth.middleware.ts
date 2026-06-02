import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import redisClient from "../config/redis";
import { requestContext } from "../context/requestContext";
import { AuthenticatedRequest } from "./contextMiddleware";
import { JWTPayload } from "../types";

export function authenticate(
  req:  Request,
  res:  Response,
  next: NextFunction
): void {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ??
    req.cookies?.jwt;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Please log in to continue.",
    });
    return;
  }

  let decoded: { user: JWTPayload; exp: number };

  try {
    decoded = jwt.verify(token, process.env.JWT_CODE!, {
      issuer:   "selleasi",
      audience: "selleasi-client",
    }) as { user: JWTPayload; exp: number };
  } catch {
    res.status(401).json({
      success: false,
      message: "Your session has expired. Please log in again.",
    });
    return;
  }

  const { userId } = decoded.user;

  redisClient
    .get(`blocklist:${userId}`)
    .then((blocked) => {
      if (blocked) {
        res.status(401).json({
          success: false,
          message: "Your session has expired. Please log in again.",
        });
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
      res.status(503).json({
        success: false,
        message: "We are experiencing technical difficulties. Please try again in a moment.",
      });
    });
}