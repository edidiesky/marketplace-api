import "./utils/otel";
import express, { Application, NextFunction, Request, Response } from "express";
import cors         from "cors";
import helmet       from "helmet";
import cookieParser from "cookie-parser";
import morgan       from "morgan";
import axios, { AxiosResponse } from "axios";
import { randomUUID } from "crypto";
import dotenv from 'dotenv'
dotenv.config()
import { errorHandler, NotFound }  from "./middleware/error-handler";
import { authenticate }            from "./middleware/authentication";
import { rateLimiter }             from "./middleware/rateLimiter";
import { subdomainResolver }       from "./middleware/subdomainResolver";
import { getBreaker }              from "./utils/createBreaker";
import { apiGatewayRegistry }      from "./utils/metrics";
import logger                      from "./utils/logger";
import swaggerUi                   from "swagger-ui-express";
import { aggregateSpecs }          from "./utils/swaggerAggregator";
import rulesRouter                 from "./routes/rules.routes";

import {
  BAD_REQUEST_STATUS_CODE,
  SERVER_ERROR_STATUS_CODE,
  Services,
  services,
  PUBLIC_ROUTES,
  WEBHOOK_PATH_PREFIX,
  WP_PROBE_PATHS,
  FORWARDED_HEADERS,
  SERVICE_NAME,
} from "./constants";

const app: Application = express();

if (!process.env.WEB_ORIGIN)    throw new Error("WEB_ORIGIN env var is not set");
if (!process.env.JWT_CODE)      throw new Error("JWT_CODE env var is not set");
if (!process.env.BASE_DOMAIN)   throw new Error("BASE_DOMAIN env var is not set");

app.use(helmet());
app.use(
  cors({
    origin:         [process.env.WEB_ORIGIN],
    methods:        ["POST", "GET", "DELETE", "PUT", "PATCH"],
    credentials:    true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "x-paystack-signature",
      "verif-hash",
      "x-request-id",
      "Accept",
      "User-Agent",
    ],
  })
);
app.use(morgan("dev", { skip: (_req, res) => res.statusCode < 400 }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = (req.headers["x-request-id"] as string) ?? randomUUID();
  req.headers["x-request-id"] = requestId;

  logger.info("gateway_request_received", {
    event:     "gateway_request_received",
    service:   SERVICE_NAME,
    method:    req.method,
    url:       req.url,
    ip:        req.ip,
    requestId,
  });

  next();
});
// handle gateway probing
app.use((req: Request, res: Response, next: NextFunction) => {
  const firstSegment = req.path.split("/").filter(Boolean)[0];
  if (firstSegment && WP_PROBE_PATHS.has(firstSegment)) {
    logger.warn("gateway_probe_blocked", {
      event:     "gateway_probe_blocked",
      service:   SERVICE_NAME,
      path:      req.path,
      ip:        req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.status(404).json({ success: false, message: "Not found." });
    return;
  }
  next();
});

// resolve subdomain
app.use(subdomainResolver);

// andling health check
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: SERVICE_NAME });
});

// andling health metrics
app.get("/metrics", async (_req: Request, res: Response) => {
  try {
    res.set("Content-Type", apiGatewayRegistry.contentType);
    res.end(await apiGatewayRegistry.metrics());
  } catch (error) {
    logger.error("gateway_metrics_scrape_failed", {
      event:   "gateway_metrics_scrape_failed",
      service: SERVICE_NAME,
      error:   error instanceof Error ? error.message : String(error),
    });
    res.status(SERVER_ERROR_STATUS_CODE).end();
  }
});

let cachedSpec: unknown = null;
let cacheTime            = 0;
const CACHE_TTL_MS       = 60_000;

app.get("/api-docs/swagger.json", async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (!cachedSpec || now - cacheTime > CACHE_TTL_MS) {
      cachedSpec = await aggregateSpecs();
      cacheTime  = now;
    }
    res.setHeader("Content-Type", "application/json");
    res.send(cachedSpec);
  } catch (err) {
    logger.error("gateway_swagger_aggregation_failed", {
      event:   "gateway_swagger_aggregation_failed",
      service: SERVICE_NAME,
      error:   err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ success: false, message: "Failed to load API docs." });
  }
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    customSiteTitle: "Selleasi API Docs",
    customCss: `
      .swagger-ui .topbar { background-color: #1a1a2e; }
      .swagger-ui .topbar-wrapper img { display: none; }
      .swagger-ui .topbar-wrapper::before {
        content: 'Selleasi Marketplace API';
        color: white;
        font-size: 18px;
        font-weight: 600;
        padding-left: 16px;
      }
    `,
    swaggerOptions: {
      url:                      "/api-docs/swagger.json",
      persistAuthorization:     true,
      displayRequestDuration:   true,
      filter:                   true,
      deepLinking:              true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth:  1,
      docExpansion:             "none",
    },
  })
);

app.use("/api/v1/rules", authenticate, rulesRouter);

app.use(
  "/:service/*",
  (req: Request, res: Response, next: NextFunction) => {
    const service = req.params["service"] as keyof Services;
    const path    = req.params[0] as string;

    const isPublic  = PUBLIC_ROUTES.has(service);
    const isWebhook = service === "payment" && path.startsWith(WEBHOOK_PATH_PREFIX);

    if (isPublic || isWebhook) return next();

    return authenticate(req, res, next);
  }
);

app.use(
  "/:service/*",
  (req: Request, res: Response, next: NextFunction) => {
    const service = req.params["service"] as keyof Services;
    const path    = req.params[0] as string;

    const isWebhook = service === "payment" && path.startsWith(WEBHOOK_PATH_PREFIX);
    if (isWebhook) return next();

    return rateLimiter(req, res, next);
  }
);

app.use(
  "/:service/*",
  async (req: Request, res: Response): Promise<void> => {
    const service   = req.params["service"] as keyof Services;
    const path      = req.params[0] as string;
    const targetURL = services[service];

    if (!targetURL) {
      logger.warn("gateway_unknown_service", {
        event:   "gateway_unknown_service",
        service: SERVICE_NAME,
        target:  service,
        ip:      req.ip,
      });
      res.status(BAD_REQUEST_STATUS_CODE).json({
        success: false,
        message: `Service does not exist: ${service}`,
      });
      return;
    }

    const forwardedHeaders: Record<string, string | undefined> = {
      "content-type": "application/json",
    };

    for (const header of FORWARDED_HEADERS) {
      const value = req.headers[header];
      if (value) {
        forwardedHeaders[header] = Array.isArray(value) ? value[0] : value;
      }
    }

    if (req.user) {
      forwardedHeaders["x-user-id"]         = req.user.userId;
      forwardedHeaders["x-user-type"]       = req.user.userType;
      forwardedHeaders["x-organization-id"] = req.user.organizationId;
    }

    if (req.storeContext) {
      forwardedHeaders["x-store-id"]              = req.storeContext.storeId;
      forwardedHeaders["x-store-organization-id"] = req.storeContext.organizationId;
      forwardedHeaders["x-store-name"]            = req.storeContext.storeName;
    }

    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    }

    const queryString = queryParams.toString();
    const fullUrl     = queryString
      ? `${targetURL}/${path}?${queryString}`
      : `${targetURL}/${path}`;

    logger.info("gateway_proxying_request", {
      event:          "gateway_proxying_request",
      service:        SERVICE_NAME,
      target:         service,
      method:         req.method,
      url:            fullUrl,
      storeId:        req.storeContext?.storeId,
      requestId:      req.headers["x-request-id"],
    });

    const breaker = getBreaker(service);

    try {
      const response = (await breaker.fire(async () =>
        axios({
          method: req.method,
          url:    fullUrl,
          data:   req.body,
          headers: {
            ...forwardedHeaders,
            host: new URL(targetURL).host,
          },
          timeout:        8_000,
          validateStatus: (status) => status < 500,
        })
      )) as AxiosResponse;

      res
        .status(response.status)
        .set("Cache-Control", "no-cache")
        .json(response.data);
    } catch (error: unknown) {
      const err = error as {
        isBreakerOpen?: boolean;
        message?:       string;
        response?: {
          status?: number;
          data?:   unknown;
        };
      };

      if (err.isBreakerOpen) {
        logger.warn("gateway_circuit_breaker_open", {
          event:   "gateway_circuit_breaker_open",
          service: SERVICE_NAME,
          target:  service,
          path,
        });
        res.status(503).json({
          success:    false,
          message:    `${service} is currently unavailable. Please try again shortly.`,
          retryAfter: 30,
        });
        return;
      }

      const status    = err.response?.status ?? SERVER_ERROR_STATUS_CODE;
      const errorData = err.response?.data;

      logger.error("gateway_proxy_error", {
        event:     "gateway_proxy_error",
        service:   SERVICE_NAME,
        target:    service,
        path,
        status,
        error:     err.message,
        requestId: req.headers["x-request-id"],
      });

      res.status(status).json(
        errorData ?? {
          success: false,
          message: "An unexpected error occurred.",
        }
      );
    }
  }
);

app.use(NotFound);
app.use(errorHandler);

export { app };