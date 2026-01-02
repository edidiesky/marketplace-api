import logger from "../utils/logger";
import { paymentService } from "../services/payment.service";
import {
  MAX_RETRIES,
  BASE_DELAY_MS,
  JITTER,
  ORDER_PAYMENT_COMPLETED_TOPIC,
  ORDER_COMPLETED_TOPIC,
  ORDER_PAYMENT_FAILED_TOPIC,
} from "../constants";
import redisClient from "../config/redis";
import { sendPaymentMessage } from "./producer";

export const PaymentTopic = {
  [ORDER_PAYMENT_FAILED_TOPIC]: async (data: any) => {
    const { orderId, reason, sagaId } = data;

    const idempotencyKey = `payment-failed-${orderId}`;
    const locked = await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX");
    if (!locked) return;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // await paymentService.markPaymentFailed(orderId);
        await sendPaymentMessage(ORDER_PAYMENT_FAILED_TOPIC, {
          orderId,
          reason,
          sagaId,
          failedAt: new Date().toISOString(),
        });

        logger.info("Payment failed processed", { orderId, reason });
        break;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          if (error instanceof Error) {
            logger.error("Failed to handle payment failure", {
              orderId,
              message: error.message,
              stack: error.stack,
            });
          }
          // wills end to DLQ later on
        }
        const delay = Math.pow(2, attempt) * BASE_DELAY_MS;
        await new Promise((resolve) => setTimeout(resolve, JITTER + delay));
      }
    }
  },
};
