import type { Channel, ConsumeMessage } from "amqplib";
import {
  SERVICE_NAME,
  ROUTING_KEYS,
  MAX_RETRIES,
  BASE_DELAY_MS,
  getJitter,
} from "../../constants";
import { requestContext } from "../../context/requestContext";
import logger              from "../../utils/logger";
import redisClient          from "../../config/redis";
import { paymentService }   from "../../domains/payment/payment.service";
import { paymentRepository } from "../../domains/payment/payment.repository";

interface OrderFailedEvent {
  orderId:  string;
  userId:   string;
  storeId:  string;
  sagaId:   string;
  reason:   string;
  failedAt: string;
}

export const paymentHandlers: Record<
  string,
  (data: unknown, channel: Channel, msg: ConsumeMessage) => Promise<void>
> = {
  [ROUTING_KEYS.ORDER_FAILED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as OrderFailedEvent;
    const { orderId, sagaId, reason } = event;
    if (!reason.startsWith("REFUND_REQUIRED")) {
      channel.ack(msg);
      return;
    }

    const idempotencyKey = `payment:refund:${sagaId}`;
    const acquired = await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX");
    if (!acquired) {
      logger.info("payment_handler_refund_duplicate_skipped", {
        event:     "payment_handler_refund_duplicate_skipped",
        service:   SERVICE_NAME,
        orderId,
        sagaId,
        requestId: requestContext.get()?.requestId,
      });
      channel.ack(msg);
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const payment = await paymentRepository.findByOrderId(orderId);
        if (!payment) {
          logger.warn("payment_handler_refund_no_payment_found", {
            event:     "payment_handler_refund_no_payment_found",
            service:   SERVICE_NAME,
            orderId,
            sagaId,
            requestId: requestContext.get()?.requestId,
          });
          channel.ack(msg);
          return;
        }

        await paymentService.initiateRefund(
          payment.paymentId,
          undefined,
          `Order saga compensation: ${reason}`
        );

        logger.info("payment_handler_refund_processed", {
          event:     "payment_handler_refund_processed",
          service:   SERVICE_NAME,
          orderId,
          sagaId,
          reason,
          requestId: requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("payment_handler_refund_failed", {
          event:     "payment_handler_refund_failed",
          service:   SERVICE_NAME,
          orderId,
          sagaId,
          attempt:   attempt + 1,
          error:     message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          logger.error("payment_refund_requires_manual_intervention", {
            event:   "payment_refund_requires_manual_intervention",
            service: SERVICE_NAME,
            orderId,
            sagaId,
          });
          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) + getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },
};