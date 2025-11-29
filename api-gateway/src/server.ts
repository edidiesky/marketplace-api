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
import axios from "axios";
import { authenticate } from "./middleware/authentication";
declare module "express" {
  interface Request {
    proxyTarget?: string;
  }
}
const app: Application = express();

// Custom request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  next();
});

// Security and parsing middleware
app.use(helmet());
app.use((req, res, next) => {
  express.json({ limit: "10mb" })(req, res, next);
});
app.use((req, res, next) => {
  express.urlencoded({ extended: false })(req, res, next);
});
app.use(cookieParser());
app.use(
  morgan("dev", {
    skip: (req, res) => res.statusCode < 400,
  })
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
  })
  
);

/**
 * @description: Health check
 */
app.get("/health", (req: Request, res: Response) => {
  logger.info("Health check requested", { ip: req.ip });
  res.status(200).json({ message: "Server is running" });
});

/**
 * @description  metrics gatering endpoint
 */
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", apiGatewayRegistry.contentType);
    res.end(await apiGatewayRegistry.metrics());
    logger.info("Api Gateway Metrics has been scraped successfully!");
  } catch (error) {
    logger.error("Api Gateway Metrics scraping error:", { error });
  }
});

// Block WordPress probes
app.use((req: Request, res: Response, next: NextFunction) => {
  const wpPaths = [
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
  ];
  const pathSegments = req.path.split("/").filter((segment) => segment);
  if (wpPaths.includes(pathSegments[0])) {
    logger.warn(`Blocked malicious probe: ${req.path}`, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.status(404).json({ error: "Not Found" });
    return;
  }
  next();
});

/**
 * @description Conditionally applying authentication middleware
 */
app.use("/:service/*", (req: Request, res: Response, next: NextFunction) => {
  logger.info("The API gateway url:", {
    params: req.params,
  });
  const service = req.params.service as keyof Services;
  logger.info("Authenticating request for service:", { service });
  if (
    req.originalUrl.startsWith("/api-docs") ||
    req.originalUrl.startsWith("/openapi.json") ||
    req.params[0] === "health"
  ) {
    return next();
  } else if (service !== "auth") {
    return authenticate(req, res, next);
  }
  next();
});

/**
 * @description Service Request Routing
 */
app.use(
  "/:service/*",
  async (req: Request, res: Response, next: NextFunction) => {
    const service = req.params.service as keyof Services;
    const targetURL = services[service];
    const requestPath = req.params[0];

    logger.info("service data:", {
      service,
      targetURL,
      requestPath,
      params: req.params
    })

    if (!targetURL) {
      logger.error(`Service not found: ${service}`);
      res.status(BAD_REQUEST_STATUS_CODE);
      return next(new Error(`The service does not exist: ${service}`));
    }

    try {
      const forwardedHeaders = {
        "content-type": "application/json",
        authorization: req.headers.authorization,
        cookie: req.headers.cookie,
        "x-paystack-signature": req.headers["x-paystack-signature"],
        "verif-hash": req.headers["verif-hash"],
      };

      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (value) {
          queryParams.append(key, value.toString());
        }
      }
      const queryString = queryParams.toString();
      const fullUrl = queryString
        ? `${targetURL}/${requestPath}?${queryString}`
        : `${targetURL}/${requestPath}`;

      logger.info(`Proxying ${req.method} request to ${fullUrl}`, {});

      const response = await axios({
        method: req.method,
        url: fullUrl,
        data: req.body,
        headers: {
          ...forwardedHeaders,
          host: new URL(targetURL).host,
        },
        responseType: "stream",
      });
      res.setHeader("Cache-Control", "no-cache");

      response.data.pipe(res);

      logger.info(`Successfully streamed response from ${service}`, {
        service,
        requestPath,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Internal Server Error";
      const status = error.response?.status || SERVER_ERROR_STATUS_CODE;

      let errorData = error.response?.data;
      if (errorData && typeof errorData === "object") {
        try {
          if (errorData.pipe) {
            const chunks: Buffer[] = [];
            await new Promise((resolve, reject) => {
              errorData.on("data", (chunk: Buffer) => chunks.push(chunk));
              errorData.on("end", resolve);
              errorData.on("error", reject);
            });
            errorData = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          }
        } catch (parseError) {
          errorData = { error: "Failed to parse error response" };
        }
      }

      logger.error("API Gateway error:", {
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
  }
);

/**
 * @description Error jandling middleware
 */
app.use(NotFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  logger.info(`API Gateway is running on http://localhost:${PORT}`);
});
