import { Request, Response, NextFunction } from "express";
import { resolveSubdomain }  from "../utils/subdomain";
import logger                from "../utils/logger";
import { SERVICE_NAME }      from "../constants";

declare global {
  namespace Express {
    interface Request {
      storeContext?: {
        storeId:        string;
        organizationId: string;
        storeName:      string;
      };
    }
  }
}

export async function subdomainResolver(
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> {
  const host =
    (req.headers["x-forwarded-host"] as string) ??
    (req.headers["host"] as string) ??
    "";

  if (!host) {
    next();
    return;
  }

  try {
    const ctx = await resolveSubdomain(host);

    if (ctx) {
      req.storeContext = ctx;

      logger.debug("subdomain_context_attached", {
        event:     "subdomain_context_attached",
        service:   SERVICE_NAME,
        storeId:   ctx.storeId,
        storeName: ctx.storeName,
        requestId: req.headers["x-request-id"],
      });
    }

    next();
  } catch (err) {
    logger.error("subdomain_resolver_middleware_error", {
      event:     "subdomain_resolver_middleware_error",
      service:   SERVICE_NAME,
      host,
      error:     err instanceof Error ? err.message : String(err),
      requestId: req.headers["x-request-id"],
    });

    res.status(503).json({
      success: false,
      message: "We are experiencing technical difficulties. Please try again in a moment.",
    });
  }
}