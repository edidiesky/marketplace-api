import logger from "../../utils/logger";
import { paymentService } from "../../services/payment.service";
import {
  MAX_RETRIES,
  BASE_DELAY_MS,
  JITTER,
  ORDER_PAYMENT_FAILED_TOPIC,
} from "../../constants";
import { redisClient } from "../cache/redis";

export const PaymentTopic = {
  [ORDER_PAYMENT_FAILED_TOPIC]: async (data: any) => {
    const { orderId, sagaId } = data;

    const idempotencyKey = `payment-mark-failed-${sagaId || orderId}`;
    if (!(await redisClient.getClient().set(idempotencyKey, "1", "EX", 3600, "NX"))) {
      logger.info("Duplicate payment failed event ignored", { orderId, sagaId });
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await paymentService.markPaymentFailed(orderId);
        logger.info("Payment marked failed", { orderId, sagaId });
        return;
      } catch (error: any) {
        logger.error(`Mark payment failed (attempt ${attempt + 1})`, {
          orderId,
          sagaId,
          error: error.message,
        });
        if (attempt === MAX_RETRIES - 1) {
          logger.error("All retries exhausted for mark payment failed", {
            orderId,
            sagaId,
          });
          return;
        }
        const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },
};