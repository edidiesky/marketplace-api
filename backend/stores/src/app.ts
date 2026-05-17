import "./utils/otel";
import express      from "express";
import helmet       from "helmet";
import cors         from "cors";
import cookieParser from "cookie-parser";
import morgan       from "morgan";

import storeRoutes                from "./domains/stores/store.routes";
import { errorHandler, NotFound } from "./middleware/error-handler";
import { contextMiddleware }      from "./middleware/contextMiddleware";
import { reqReplyTime, storesRegistry } from "./utils/metrics";
import logger                     from "./utils/logger";
import { SERVER_ERROR_STATUS_CODE } from "./constants";

const app = express();

if (!process.env.WEB_ORIGIN) {
  throw new Error("WEB_ORIGIN env var is not set");
}

if (!process.env.PLATFORM_DOMAIN) {
  throw new Error("PLATFORM_DOMAIN env var is not set");
}

if (!process.env.CADDY_ADMIN_URL) {
  throw new Error("CADDY_ADMIN_URL env var is not set");
}

if (!process.env.FRONTEND_UPSTREAM) {
  throw new Error("FRONTEND_UPSTREAM env var is not set");
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
  res.json({ status: "ok", service: "stores-service" });
});

app.use("/api/v1/stores", storeRoutes);

app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", storesRegistry.contentType);
    res.end(await storesRegistry.metrics());
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