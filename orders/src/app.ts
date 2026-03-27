'./utils/otel'
import helmet from "helmet";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
dotenv.config();
import morgan from "morgan";
import productRoute from "./routes/order.routes"
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { reqReplyTime, orderRegistry } from "./utils/metrics";
import logger from "./utils/logger";
import { SERVER_ERROR_STATUS_CODE } from "./constants";
import { ordersSwaggerSpec } from "./config/swagger";

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
  res.json({ status: "Order route is Fine!" });
});

/** ROUTES */
app.use("/api/v1/orders", productRoute);


// SWAGGER DOCS
app.get("/openapi.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(ordersSwaggerSpec);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(ordersSwaggerSpec, {
    customSiteTitle: "Orders Service API",
    customCss: ".swagger-ui .topbar { display: none }",
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

/**
 * @description Metrics endpoint for my Prometheus server
 */
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", orderRegistry.contentType);
    res.end(await orderRegistry.metrics());
    logger.info("Order Metrics has been scraped successfully!");
  } catch (error) {
    logger.error("Order Metrics scraping error:", { error });
    res.status(SERVER_ERROR_STATUS_CODE).end();
  }
});

export { app };