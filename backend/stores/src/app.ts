import "./utils/otel";
import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import storeRoute from "./routes/store.routes";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler, NotFound } from "./middleware/error-handler";
import { reqReplyTime, storeRegistry } from "./utils/metrics";
import logger from "./utils/logger";
import { SERVER_ERROR_STATUS_CODE } from "./constants";
import swaggerUi from "swagger-ui-express";
import { storesSwaggerSpec } from "./config/swagger";
import { contextMiddleware } from "./middleware/context.middleware";

const app = express();

if (!process.env.WEB_ORIGIN) {
  throw new Error("WEB_ORIGIN env var is not set");
}

app.use(helmet());
app.use(
  cors({
    origin: [process.env.WEB_ORIGIN!],
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

//  syncLocalStorage per request
app.use(contextMiddleware);

// Latency metrics
app.use((req, res, next) => {
  const startTime = process.hrtime();
  res.on("finish", () => reqReplyTime(req, res, startTime));
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1/stores", storeRoute);

app.get("/openapi.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(storesSwaggerSpec);
});
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(storesSwaggerSpec, {
    customSiteTitle: "Stores MicroService API",
    swaggerOptions: { persistAuthorization: true },
  })
);

app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", storeRegistry.contentType);
    res.end(await storeRegistry.metrics());
    logger.info("Store metrics scraped", { eventType: "metrics.scraped" });
  } catch (err) {
    logger.error("Metrics scraping error", {
      error: err instanceof Error ? err.message : String(err),
      eventType: "metrics.scrape.failed",
    });
    res.status(SERVER_ERROR_STATUS_CODE).end();
  }
});

app.use(NotFound);
app.use(errorHandler);

export { app };