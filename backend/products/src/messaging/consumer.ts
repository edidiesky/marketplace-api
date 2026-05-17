import logger from "../utils/logger";
import { SERVICE_NAME } from "../constants";

export async function connectProductsConsumer(): Promise<void> {
  logger.info("products_consumer_skipped", {
    event:   "products_consumer_skipped",
    service: SERVICE_NAME,
    reason:  "products-service is publish-only, no inbound queues",
  });
}

export async function disconnectProductsConsumer(): Promise<void> {
  logger.info("products_consumer_disconnected", {
    event:   "products_consumer_disconnected",
    service: SERVICE_NAME,
  });
}