import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import productRoute from "./routes/store.routes"
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler, NotFound } from "./middleware/error-handler";
import { reqReplyTime, productRegistry } from "./utils/metrics";
import logger from "./utils/logger";
import { SERVER_ERROR_STATUS_CODE } from "./constants";

const app = express();

/** MIDDLEWARE */
if (!process.env.WEB_ORIGIN) {
  throw new Error("No WEB_ORIGIN");
}
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.WEB_ORIGIN!,
      process.env.WEB_ORIGIN2!,
      process.env.WEB_ORIGIN3!,
    ],
    credentials: true,
  })
);

/** LOGS REQUEST */
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// LATENCY METRICS MIDDLEWARE
app.use((req, res, next) => {
  const startTime = process.hrtime();
  res.on("finish", () => reqReplyTime(req, res, startTime));
  next();
});

/** HEALTH CHECK */
app.get("/health", (_req, res) => {
  res.json({ status: "Product route is Fine!" });
});

/** ROUTE */
app.use("/api/v1/stores", productRoute);

/**
 * @description Metrics endpoint for my Prometheus server
 */
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", productRegistry.contentType);
    res.end(await productRegistry.metrics());
    logger.info("Product Metrics has been scraped successfully!");
  } catch (error) {
    logger.error("Product Metrics scraping error:", { error });
    res.status(SERVER_ERROR_STATUS_CODE).end();
  }
});

app.use(errorHandler);
app.use(NotFound);

export { app };