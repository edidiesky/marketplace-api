import "./utils/otel";
import swaggerUi from "swagger-ui-express";
import { aggregateSpecs } from "./utils/swaggerAggregator";
import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { errorHandler, NotFound } from "./middleware/error-handler";
import {
  BAD_REQUEST_STATUS_CODE,
  SERVER_ERROR_STATUS_CODE,
  Services,
  services,
} from "./constants";
import logger from "./utils/logger";
import { apiGatewayRegistry } from "./utils/metrics";
import axios, { AxiosResponse } from "axios";
import { authenticate } from "./middleware/authentication";
import { rateLimiter } from "./middleware/rateLimiter";
import { getBreaker } from "./utils/createBreaker";
import { Readable } from "stream";

declare module "express" {
  interface Request {
    proxyTarget?: string;
  }
}

const app: Application = express();

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  next();
});

app.use(helmet());
app.use((req, res, next) => express.json({ limit: "10mb" })(req, res, next));
app.use((req, res, next) =>
  express.urlencoded({ extended: false })(req, res, next),
);
app.use(cookieParser());
app.use(
  morgan("dev", {
    skip: (_req, res) => res.statusCode < 400,
  }),
);
app.use(
  cors({
    origin: [process.env.WEB_ORIGIN!],
    methods: ["POST", "GET", "DELETE", "PUT", "PATCH"],
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "x-paystack-signature",
      "verif-hash",
      "Accept",
      "User-Agent",
    ],
  }),
);

app.get("/health", (req: Request, res: Response) => {
  logger.info("Health check requested", { ip: req.ip });
  res.status(200).json({ message: "Server is running" });
});

app.get("/metrics", async (_req: Request, res: Response) => {
  try {
    res.set("Content-Type", apiGatewayRegistry.contentType);
    res.end(await apiGatewayRegistry.metrics());
    logger.info("Api Gateway Metrics scraped successfully");
  } catch (error) {
    logger.error("Api Gateway Metrics scraping error:", { error });
    res.status(SERVER_ERROR_STATUS_CODE).end();
  }
});

const WP_PROBE_PATHS = new Set([
  "wp-admin",
  "wp-includes",
  "xmlrpc.php",
  "wp-login.php",
  ".env",
  "phpinfo.php",
  "php.ini",
  "server-status",
  "admin",
  "phpmyadmin",
]);

app.use((req: Request, res: Response, next: NextFunction) => {
  const firstSegment = req.path.split("/").filter(Boolean)[0];
  if (firstSegment && WP_PROBE_PATHS.has(firstSegment)) {
    logger.warn(`Blocked malicious probe: ${req.path}`, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.status(404).json({ error: "Not Found" });
    return;
  }
  next();
});

// Authentication
app.use("/:service/*", (req: Request, res: Response, next: NextFunction) => {
  const service = req.params.service as keyof Services;
  const path = req.params[0];

  if (
    req.originalUrl.startsWith("/api-docs") ||
    req.originalUrl.startsWith("/openapi.json") ||
    path === "health" ||
    service === "auth" ||
    (service === "payment" && path.startsWith("api/v1/webhooks/"))
  ) {
    return next();
  }

  return authenticate(req, res, next);
});

// Rate limiting
app.use("/:service/*", (req: Request, res: Response, next: NextFunction) => {
  const service = req.params.service as keyof Services;
  const path = req.params[0];

  if (service === "payment" && path.startsWith("api/v1/webhooks/")) {
    return next();
  }

  return rateLimiter(req, res, next);
});

// Proxy handler
app.use(
  "/:service/*",
  async (req: Request, res: Response, next: NextFunction) => {
    const service = req.params.service as keyof Services;
    const targetURL = services[service];
    const requestPath = req.params[0];

    if (!targetURL) {
      logger.error(`Unknown service: ${service}`);
      res.status(BAD_REQUEST_STATUS_CODE).json({
        status: "error",
        error: `Service does not exist: ${service}`,
      });
      return;
    }

    const forwardedHeaders: Record<string, string | undefined> = {
      "content-type": "application/json",
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
      "x-paystack-signature": req.headers["x-paystack-signature"] as
        | string
        | undefined,
      "verif-hash": req.headers["verif-hash"] as string | undefined,
    };

    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    }

    const queryString = queryParams.toString();
    const fullUrl = queryString
      ? `${targetURL}/${requestPath}?${queryString}`
      : `${targetURL}/${requestPath}`;

    logger.info(`Proxying ${req.method} -> ${fullUrl}`);

    const breaker = getBreaker(service);

    try {
      const response = (await breaker.fire(async () =>
        axios({
          method: req.method,
          url: fullUrl,
          data: req.body,
          headers: {
            ...forwardedHeaders,
            host: new URL(targetURL).host,
          },
          timeout: 8000,
          validateStatus: (status) => status < 500,
        }),
      )) as AxiosResponse;

      res
        .status(response.status)
        .set("Cache-Control", "no-cache")
        .json(response.data);
    } catch (error: any) {
      if (error.isBreakerOpen) {
        logger.warn(`Circuit breaker open for ${service}`, {
          service,
          requestPath,
        });
        res.status(503).json({
          status: "error",
          error: error.message,
          retryAfter: 30,
        });
        return;
      }

      const status = error.response?.status || SERVER_ERROR_STATUS_CODE;
      const errorData = error.response?.data;

      logger.error("Proxy error", {
        service,
        requestPath,
        error: error.message,
        status,
      });

      if (errorData?.status === "error" && errorData?.errors) {
        res.status(status).json(errorData);
      } else {
        res.status(status).json({
          status: "error",
          error: errorData || error.message,
        });
      }
    }
  },
);

// Serving aggregated spec fetched fresh on each request in dev,
// cached in prod via the 60s interval below
let cachedSpec: any = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60_000;

app.get("/api-docs/swagger.json", async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (!cachedSpec || now - cacheTime > CACHE_TTL_MS) {
      cachedSpec = await aggregateSpecs();
      cacheTime = now;
    }
    res.setHeader("Content-Type", "application/json");
    res.send(cachedSpec);
  } catch (err) {
    logger.error("Failed to aggregate swagger specs", { err });
    res.status(500).json({ error: "Failed to load API documentation" });
  }
});

// Serve Swagger UI pointing at the aggregated spec
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
      url: "/api-docs/swagger.json",
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      deepLinking: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      docExpansion: "none",
    },
  })
);
app.use(NotFound);
app.use(errorHandler);

export { app };
