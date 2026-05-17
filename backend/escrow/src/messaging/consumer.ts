import logger from "../utils/logger";
import { SERVICE_NAME } from "../constants";

export async function connectPaymentConsumer(): Promise<void> {
  logger.info("payment_consumer_skipped", {
    event:   "payment_consumer_skipped",
    service: SERVICE_NAME,
    reason:  "payment-service is publish-only via outbox poller",
  });
}

export async function disconnectPaymentConsumer(): Promise<void> {
  logger.info("payment_consumer_disconnected", {
    event:   "payment_consumer_disconnected",
    service: SERVICE_NAME,
  });
}