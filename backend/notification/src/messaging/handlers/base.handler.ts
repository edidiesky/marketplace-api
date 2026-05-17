import type { Channel, ConsumeMessage } from "amqplib";
import redisClient          from "../../config/redis";
import logger               from "../../utils/logger";
import {
  SERVICE_NAME,
  MAX_RETRIES,
  BASE_DELAY_MS,
  IDEMPOTENCY_TTL_SEC,
  getJitter,
} from "../../constants";
import { requestContext }   from "../../context/requestContext";

export abstract class BaseNotificationHandler {
  protected abstract routingKey: string;

  protected abstract handle(data: unknown): Promise<void>;

  protected idempotencyKey(data: unknown): string {
    const d = data as Record<string, string>;
    const notificationId = d["notificationId"] ?? d["sagaId"] ?? d["orderId"] ?? "";
    return `notification:${this.routingKey}:${notificationId}`;
  }

  async process(
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> {
    const key      = this.idempotencyKey(data);
    const acquired = await redisClient.set(key, "1", "EX", IDEMPOTENCY_TTL_SEC, "NX");

    if (!acquired) {
      logger.info("notification_handler_duplicate_skipped", {
        event:      "notification_handler_duplicate_skipped",
        service:    SERVICE_NAME,
        routingKey: this.routingKey,
        key,
        requestId:  requestContext.get()?.requestId,
      });
      channel.ack(msg);
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await this.handle(data);

        logger.info("notification_handler_success", {
          event:      "notification_handler_success",
          service:    SERVICE_NAME,
          routingKey: this.routingKey,
          attempt:    attempt + 1,
          requestId:  requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("notification_handler_attempt_failed", {
          event:      "notification_handler_attempt_failed",
          service:    SERVICE_NAME,
          routingKey: this.routingKey,
          attempt:    attempt + 1,
          error:      message,
          requestId:  requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          logger.error("notification_handler_max_retries_exhausted", {
            event:      "notification_handler_max_retries_exhausted",
            service:    SERVICE_NAME,
            routingKey: this.routingKey,
            requestId:  requestContext.get()?.requestId,
          });
          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) +
          getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
}