import rateLimit from "express-rate-limit";
import logger from "../utils/logger";
import { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number | ((req: Request) => number);
  prefix?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request) => void;
}

const createLimiter = (options: RateLimitOptions) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator:
      options.keyGenerator ||
      ((req: Request) => {
        return req.user?.userId
          ? `${options.prefix || "rate"}:${req.user.userId}`
          : `${options.prefix || "rate"}:${req.ip}`;
      }),
    skip: (req: Request) => req.url === "/health" || req.url === "/metrics",
    message: async (req: Request, res: Response) => {
      const remainingMs =
        Number(res.getHeader("X-RateLimit-Reset")) * 1000 - Date.now();
      const retryAfterSeconds = Math.ceil(remainingMs / 1000);
      const maxRequests =
        typeof options.max === "function" ? options.max(req) : options.max;
      return {
        status: "error",
        error: `You have exceeded the limit of ${maxRequests} requests within a ${Math.floor(
          options.windowMs / 60000
        )}-minute period. Please wait ${retryAfterSeconds} seconds before trying again.`,
        retryAfter: retryAfterSeconds,
        code: "RATE_LIMIT_EXCEEDED",
      };
    },
    handler: (req: Request, res: Response, next: NextFunction, optionsUsed) => {
      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        userId: req.user?.userId,
        path: req.path,
        prefix: options.prefix || "rate",
        userAgent: req.headers["user-agent"],
      });

      if (options.onLimitReached) {
        options.onLimitReached(req);
      }

      const remainingMs =
        Number(res.getHeader("X-RateLimit-Reset")) * 1000 - Date.now();
      const retryAfterSeconds = Math.ceil(remainingMs / 1000);
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      res.status(optionsUsed.statusCode).json(optionsUsed.message);
    },
  });
};

export default createLimiter;
