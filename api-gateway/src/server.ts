import "./utils/otel";
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
import { getBreaker } from "./utils/createBreaker";
import { Readable } from "stream";

declare module "express" {
  interface Request {
    proxyTarget?: string;
  }
}

const app: Application = express();

//  Request logging

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  next();
});

//  Security & parsing
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
    origin: [
      process.env.WEB_ORIGIN!,
      process.env.WEB_ORIGIN2!,
      process.env.WEB_ORIGIN3!,
    ],
    methods: ["POST", "GET", "DELETE", "PUT"],
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

//  Health check

app.get("/health", (req: Request, res: Response) => {
  logger.info("Health check requested", { ip: req.ip });
  res.status(200).json({ message: "Server is running" });
});

//  Prometheus metrics

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

//  Malicious probe blocker
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

//  Conditional authentication
app.use("/:service/*", (req: Request, res: Response, next: NextFunction) => {
  const service = req.params.service as keyof Services;

  logger.info("Authenticating request", { service, params: req.params });
  if (
    req.originalUrl.startsWith("/api-docs") ||
    req.originalUrl.startsWith("/openapi.json") ||
    req.params[0] === "health" ||
    service === "auth"
  ) {
    return next();
  }

  return authenticate(req, res, next);
});

//  Proxy handler

app.use(
  "/:service/*",
  async (req: Request, res: Response, next: NextFunction) => {
    const service = req.params.service as keyof Services;
    const targetURL = services[service];
    const requestPath = req.params[0];

    logger.info("Routing request", { service, targetURL, requestPath });

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

    logger.info(`Proxying ${req.method} → ${fullUrl}`);
    const breaker = getBreaker(service);

    try {
      const response = await breaker.fire(async () =>
        axios({
          method: req.method,
          url: fullUrl,
          data: req.body,
          headers: {
            ...forwardedHeaders,
            host: new URL(targetURL).host,
          },
          responseType: "stream",
          timeout: 8000,
        }),
      ) as AxiosResponse<Readable>;

      res.setHeader("Cache-Control", "no-cache");
      response.data.pipe(res);

      logger.info(`Successfully streamed response from ${service}`, {
        service,
        requestPath,
      });
    } catch (error: any) {
      //  Circuit breaker is open — fast fail with 503
      // Do not attempt to parse error.response here — there is no HTTP response
      // when the breaker short-circuits. Parsing a stream that does not exist
      // will hang the request.
      if (error.isBreakerOpen) {
        logger.warn(`Circuit breaker open for ${service} — returning 503`, {
          service,
          requestPath,
        });
        res.status(503).json({
          status: "error",
          error: error.message,
          retryAfter: 30, // seconds — matches breaker resetTimeout
        });
        return;
      }
      const errorMessage = error.message || "Internal Server Error";
      const status = error.response?.status || SERVER_ERROR_STATUS_CODE;
      let errorData = error.response?.data;
      if (errorData && typeof errorData === "object" && errorData.pipe) {
        try {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            errorData.on("data", (chunk: Buffer) => chunks.push(chunk));
            errorData.on("end", resolve);
            errorData.on("error", reject);
          });
          errorData = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch (parseError) {
          logger.error("Failed to parse downstream error stream", {
            parseError,
            service,
          });
          errorData = { error: "Failed to parse error response" };
        }
      }

      logger.error("API Gateway proxy error", {
        service,
        requestPath,
        error: errorMessage,
        responseData: errorData,
        status,
      });
      if (errorData?.status === "error" && errorData?.errors) {
        res.status(status).json(errorData);
      } else {
        res.status(status).json({
          status: "error",
          error: errorData || errorMessage,
        });
      }
    }
  },
);

//  Error middleware
app.use(NotFound);
app.use(errorHandler);

//  Server startup

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  logger.info(`API Gateway running on http://localhost:${PORT}`);
});

export { app };
