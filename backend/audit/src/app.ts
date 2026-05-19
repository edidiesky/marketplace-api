import "./utils/otel";
import express      from "express";
import helmet       from "helmet";
import cors         from "cors";
import cookieParser from "cookie-parser";
import morgan       from "morgan";
import dotenv from 'dotenv'
dotenv.config()
import auditRoutes                from "./domains/audit/audit.routes";
import { errorHandler, NotFound } from "./middleware/error-handler";
import { contextMiddleware }      from "./middleware/contextMiddleware";
import { reqReplyTime, auditRegistry } from "./utils/metrics";
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
  res.json({ status: "ok", service: "audit-service" });
});

app.use("/api/v1/audit", auditRoutes);

app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", auditRegistry.contentType);
    res.end(await auditRegistry.metrics());
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