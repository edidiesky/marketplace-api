import "./utils/otel";
import express      from "express";
import helmet       from "helmet";
import cors         from "cors";
import cookieParser from "cookie-parser";
import morgan       from "morgan";

import paymentRoutes              from "./domains/payment/payment.routes";
import walletRoutes               from "./domains/wallet/wallet.routes";
import payoutRoutes               from "./domains/payout/payout.routes";
import webhookRoutes              from "./domains/webhook/webhook.routes";
import { errorHandler, NotFound } from "./middleware/error-handler";
import { contextMiddleware }      from "./middleware/contextMiddleware";
import { reqReplyTime, paymentRegistry } from "./utils/metrics";
import logger                     from "./utils/logger";
import { SERVER_ERROR_STATUS_CODE } from "./constants";

const app = express();

if (!process.env.WEB_ORIGIN) {
  throw new Error("WEB_ORIGIN env var is not set");
}

if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY env var is not set");
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
  res.json({ status: "ok", service: "payment-service" });
});

app.use("/api/v1/payments",  paymentRoutes);
app.use("/api/v1/wallets",   walletRoutes);
app.use("/api/v1/payouts",   payoutRoutes);
app.use("/api/v1/webhooks",  webhookRoutes);

app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", paymentRegistry.contentType);
    res.end(await paymentRegistry.metrics());
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