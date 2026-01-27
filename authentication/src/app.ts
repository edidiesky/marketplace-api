import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import cookieParser from "cookie-parser";
import { errorHandler, NotFound } from "./middleware/error-handler";
import { reqReplyTime, userRegistry } from "./utils/metrics";
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
    ],
    credentials: true,
  })
);


/** LOGS REQUEST */
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const startTime = process.hrtime();
  res.on("finish", () => reqReplyTime(req, res, startTime));
  next();
});

/** HEALTH CHECK */
app.get("/health", (_req, res) => {
  res.json({ status: "Good" });
});

/** ROUTES */
app.use("/api/v1/auth", authRoutes);

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", userRegistry.contentType);
    res.end(await userRegistry.metrics());
    logger.info("User Metrics has been scraped successfully!");
  } catch (error) {
    logger.error("User Metrics scraping error:", { error });
    res.status(SERVER_ERROR_STATUS_CODE).end();
  }
});
app.use(NotFound);
app.use(errorHandler);

export { app };