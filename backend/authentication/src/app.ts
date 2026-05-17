import "./utils/otel";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import authRoutes       from "./domains/auth/auth.routes";
// import roleRoutes       from "./domains/roles/role.routes";
// import permissionRoutes from "./domains/permissions/permission.routes";
// import userRoleRoutes   from "./domains/user-roles/user-role.routes";

import { errorHandler, NotFound } from "./middleware/error-handler";
import { contextMiddleware }      from "./middleware/contextMiddleware";
import { reqReplyTime, authRegistry } from "./utils/metrics";
import { authSwaggerSpec }        from "./config/swagger";
import logger                     from "./utils/logger";
import { SERVER_ERROR_STATUS_CODE } from "./constants";

const app = express();

if (!process.env.WEB_ORIGIN) {
  throw new Error("WEB_ORIGIN env var is not set");
}

app.use(helmet());
app.use(cors({ origin: [process.env.WEB_ORIGIN], credentials: true }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(contextMiddleware);
app.use((req, res, next) => {
  const startTime = process.hrtime();
  res.on("finish", () => reqReplyTime(req, res, startTime));
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "authentication-service" });
});

app.use("/api/v1/auth",        authRoutes);
// app.use("/api/v1/roles",       roleRoutes);
// app.use("/api/v1/permissions", permissionRoutes);
// app.use("/api/v1/user-roles",  userRoleRoutes);

app.get("/openapi.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(authSwaggerSpec);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(authSwaggerSpec, {
    customSiteTitle: "Authentication Service API",
    swaggerOptions:  { persistAuthorization: true },
  })
);

app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", authRegistry.contentType);
    res.end(await authRegistry.metrics());
  } catch (err) {
    logger.error("metrics_scrape_failed", {
      event: "metrics_scrape_failed",
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(SERVER_ERROR_STATUS_CODE).end();
  }
});

app.use(NotFound);
app.use(errorHandler);

export { app };