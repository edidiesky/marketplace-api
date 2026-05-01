import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { requestContext, RequestContext } from "../context/requestContext";
import logger from "../utils/logger";
import { AuthenticatedRequest } from "../types";


/**
 * Extracts traceId/spanId injected by OTel WinstonInstrumentation.
 * OTel populates these on the active span context - by the time this
 * middleware runs the span is already active via auto-instrumentation.
 */
function extractOtelIds(req: Request): { traceId?: string; spanId?: string } {
  const traceId =
    (req.headers["traceparent"] as string | undefined)?.split("-")[1] ??
    (req.headers["x-b3-traceid"] as string | undefined);
  const spanId =
    (req.headers["traceparent"] as string | undefined)?.split("-")[2] ??
    (req.headers["x-b3-spanid"] as string | undefined);
  return { traceId, spanId };
}

/**
 * Must be mounted BEFORE route handlers.
 * Populates AsyncLocalStorage so every log call downstream carries full context
 * without manual prop drilling.
 */
export function contextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;
  const { traceId, spanId } = extractOtelIds(req);

  const ctx: RequestContext = {
    requestId: (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
    traceId,
    spanId,
    storeId: req.headers["x-store-id"] as string | undefined,
    tenantId: req.headers["x-tenant-id"] as string | undefined,
    userId: authReq.user?.userId,
    method: req.method,
    path: req.path,
  };

  requestContext.run(ctx, () => {
    logger.info("Request received", {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    next();
  });
}

/**
 * Enriches context with userId after authenticate() middleware has run.
 * Mount this immediately after authenticate() on protected routes.
 */
export function userContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.userId) {
    requestContext.set({ userId: authReq.user.userId });
  }
  next();
}

/**
 * Sets eventType on the current context for Kafka-emitting operations.
 * Call inside service layer before publishing an event.
 */
export function setEventType(eventType: string): void {
  requestContext.set({ eventType });
}