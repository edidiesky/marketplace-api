import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { requestContext, RequestContext } from "../context/requestContext";
import logger from "../utils/logger";
import { trace } from "@opentelemetry/api";

export interface AuthenticatedRequest extends Request {
  user: {
    userId:          string;
    userType?:       string;
    organizationId?: string;
    roles?:          string[];
    permissionIds?:  string[];
    name?:           string;
  };
}

function extractOtelIds(req: Request): {
  traceId?: string;
  spanId?:  string;
} {
  const traceparent = req.headers["traceparent"] as string | undefined;
  if (traceparent) {
    const parts = traceparent.split("-");
    return { traceId: parts[1], spanId: parts[2] };
  }
  return {
    traceId: req.headers["x-b3-traceid"] as string | undefined,
    spanId:  req.headers["x-b3-spanid"]  as string | undefined,
  };
}

export function contextMiddleware(
  req:  Request,
  _res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;
  const { traceId, spanId } = extractOtelIds(req);

  const ctx: RequestContext = {
    requestId:      (req.headers["x-request-id"] as string) ?? randomUUID(),
    traceId,
    spanId,
    storeId:        req.headers["x-store-id"]        as string | undefined,
    organizationId: req.headers["x-organization-id"] as string | undefined,
    userId:         authReq.user?.userId,
    method:         req.method,
    path:           req.path,
  };

  requestContext.run(ctx, () => {
    const span = trace.getActiveSpan();
    if (span) {
      if (ctx.userId)         span.setAttribute("app.user.id",         ctx.userId);
      if (ctx.organizationId) span.setAttribute("app.organization.id", ctx.organizationId);
      if (ctx.storeId)        span.setAttribute("app.store.id",        ctx.storeId);
      if (ctx.requestId)      span.setAttribute("app.request.id",      ctx.requestId);
    }
    logger.info("http_request", {
      event:  "http_request",
      method: req.method,
      path:   req.path,
    });
    next();
  });
}