import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";

import express from "express";
import cors from "cors";
import { setupSwagger } from "./swagger";
import cookieParser from "cookie-parser";

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

app.use((req, res, next) => {
  const startTime = process.hrtime();
  res.on("finish", () => reqReplyTime(req, res, startTime));
  next();
});

/** HEALTH CHECK */
app.get("/health", (_req, res) => {
  res.json({ status: "✅ " });
});


setupSwagger(app);

// /metrics endpoint
// app.get("/metrics", async (req, res) => {
//   try {
//     res.set("Content-Type", userRegistry.contentType);
//     res.end(await userRegistry.metrics());
//     logger.info("User Metrics has been scraped successfully!");
//   } catch (error) {
//     logger.error("User Metrics scraping error:", { error });
//     res.status(500).end();
//   }
// })

export { app };