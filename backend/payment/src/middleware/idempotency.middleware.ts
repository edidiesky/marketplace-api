import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import {
  idempotencyRepository,
  IdempotencyRepository,
} from "../repository/IdempotencyRepository";
import logger from "../utils/logger";

export function withIdempotency(endpoint: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user?.userId;

    if (!userId) {
      logger.warn("The user id does not exists");
      next();
      return;
    }

    const requestHash = IdempotencyRepository.buildHash(
      req.method,
      endpoint,
      userId,
      req.body,
    );

    const existing = await idempotencyRepository.find(requestHash);

    if (existing) {
      logger.warn("Idempotent request replayed", { endpoint, userId });
      res.status(existing.statusCode).json(existing.responseBody);
      return;
    }
    (req as any).idempotencyHash = requestHash;
    (req as any).idempotencyEndpoint = endpoint;
    next();
  };
}

export async function saveIdempotencyRecord(
  req: Request,
  userId: string,
  responseBody: Record<string, any>,
  statusCode: number,
  paymentId?: string,
): Promise<void> {
  const hash = (req as any).idempotencyHash;
  if (!hash) return;

  await idempotencyRepository.save({
    requestHash: hash,
    endpoint: (req as any).idempotencyEndpoint,
    userId: userId as any,
    paymentId,
    responseBody,
    statusCode,
  });
}
