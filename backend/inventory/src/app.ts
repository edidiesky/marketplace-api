'./utils/otel'
import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import inventoryRoute from "./routes/inventory.routes"
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler, NotFound } from "./middleware/error-handler";
import { reqReplyTime, InventoryRegistry } from "./utils/metrics";
import logger from "./utils/logger";
import { SERVER_ERROR_STATUS_CODE } from "./constants";
import { inventorySwaggerSpec } from "./config/swagger";
import swaggerUi from 'swagger-ui-express'

const app = express();

/** MIDDLEWARE */
if (!process.env.WEB_ORIGIN) {
  throw new Error("No WEB_ORIGIN");
}
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.WEB_ORIGIN!
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
  res.json({ status: "Inventory route is Fine!" });
});

/** ROUTES */
app.use("/api/v1/inventories", inventoryRoute);

app.get("/openapi.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(inventorySwaggerSpec);
});
 
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(inventorySwaggerSpec, {
    customSiteTitle: "Inventory MicroService API",
    swaggerOptions: { persistAuthorization: true },
  })
);
 
/**
 * @description Metrics endpoint for my Prometheus server
 */
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", InventoryRegistry.contentType);
    res.end(await InventoryRegistry.metrics());
    logger.info("Inventory Metrics has been scraped successfully!");
  } catch (error) {
    logger.error("Inventory Metrics scraping error:", { error });
    res.status(SERVER_ERROR_STATUS_CODE).end();
  }
});

app.use(errorHandler);
app.use(NotFound);

export { app };