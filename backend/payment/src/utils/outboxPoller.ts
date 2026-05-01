import { outboxRepository } from "../repository/OutboxRepository";
import { sendPaymentMessage } from "../infra/messaging/producer";
import {
  PAYMENT_CONFIRMED_TOPIC,
  PAYMENT_FAILED_TOPIC,
  PAYMENT_INITIATED_TOPIC,
} from "../constants";
import { OutboxEventType } from "../models/OutboxEvent";
import logger from "./logger";

const POLL_INTERVAL_MS = 5_000;
const TOPIC_MAP: Record<OutboxEventType, string> = {
  [OutboxEventType.PAYMENT_CONFIRMED]: PAYMENT_CONFIRMED_TOPIC,
  [OutboxEventType.PAYMENT_FAILED]: PAYMENT_FAILED_TOPIC,
  [OutboxEventType.PAYMENT_INITIATED]: PAYMENT_INITIATED_TOPIC,
  
};

let pollerTimer: NodeJS.Timeout | null = null;

async function pollOnce(): Promise<void> {
  const events = await outboxRepository.getPending();
  if (!events.length) return;

  logger.info(`Outbox poller: processing ${events.length} pending events`);

  for (const event of events) {
    try {
      const topic = TOPIC_MAP[event.type];
      if (!topic) {
        logger.error("Unknown outbox event type", { type: event.type });
        await outboxRepository.incrementRetry(
          event._id.toString(),
          `Unknown event type: ${event.type}`
        );
        continue;
      }

      await sendPaymentMessage(topic, event.payload);
      await outboxRepository.markProcessed(event._id.toString());

      logger.info("Outbox event published", {
        id: event._id,
        type: event.type,
        topic,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.error("Outbox event publish failed", {
        id: event._id,
        type: event.type,
        reason,
      });
      await outboxRepository.incrementRetry(event._id.toString(), reason);
    }
  }
}

export function startOutboxPoller(): void {
  if (pollerTimer) return;

  pollerTimer = setInterval(async () => {
    try {
      await pollOnce();
    } catch (err) {
      logger.error("Outbox poller error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, POLL_INTERVAL_MS);

  logger.info("Outbox poller started", { intervalMs: POLL_INTERVAL_MS });
}

export function stopOutboxPoller(): void {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
    logger.info("Outbox poller stopped");
  }
}