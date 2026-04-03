import "./utils/otel";
import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import tenantRoute from "./routes/tenant.routes";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler, NotFound } from "./middleware/error-handler";
import logger from "./utils/logger";
import { SERVER_ERROR_STATUS_CODE } from "./constants";
import { tenantSwaggerSpec } from "./config/swagger";
import swaggerUi from "swagger-ui-express";

const app = express();

if (!process.env.WEB_ORIGIN) {
  throw new Error("No WEB_ORIGIN");
}

app.use(helmet());
app.use(cors({ origin: [process.env.WEB_ORIGIN!], credentials: true }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "Tenant service is running." });
});

app.use("/api/v1/tenants", tenantRoute);

app.get("/openapi.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(tenantSwaggerSpec);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(tenantSwaggerSpec, {
    customSiteTitle: "Tenant Service API",
    swaggerOptions: { persistAuthorization: true },
  })
);

app.get("/metrics", async (_req, res) => {
  try {
    res.status(200).json({ message: "metrics endpoint" });
  } catch (error) {
    logger.error("Tenant Metrics scraping error:", { error });
    res.status(SERVER_ERROR_STATUS_CODE).end();
  }
});

app.use(errorHandler);
app.use(NotFound);

export { app };