import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import roleRoutes from "./routes/role.routes";
import { setupSwagger } from "./swagger";
import cookieParser from "cookie-parser";
import { errorHandler, NotFound } from "./middleware/error-handler";
import { reqReplyTime, userRegistry } from "./utils/metrics";
import logger from "./utils/logger";
import createLimiter from "./utils/customRateLimiter";
// import { sendUserMessage } from "./messaging/producer";

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

// METRICS MIDDLEWARE - MOVED HERE (before routes)
app.use((req, res, next) => {
  const startTime = process.hrtime();
  res.on("finish", () => reqReplyTime(req, res, startTime));
  next();
});

/** HEALTH CHECK */
app.get("/health", (_req, res) => {
  res.json({ status: "✅ " });
});

/** ROUTES */
app.use("/api/v1/auth", authRoutes);
setupSwagger(app);

// /metrics endpoint (after routes but before error handlers)
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", userRegistry.contentType);
    res.end(await userRegistry.metrics());
    logger.info("User Metrics has been scraped successfully!");
  } catch (error) {
    logger.error("User Metrics scraping error:", { error });
    res.status(500).end();
  }
});

app.use(errorHandler);
app.use(NotFound);

export { app };