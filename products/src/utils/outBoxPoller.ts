/**
 * declare the global variable for the timer
 *
 * ******** GETTING AL PENDING OUTBOX EVENTS ***
 * declare a function that starts the poling
 * it gets all pending putbox events
 * if none it exists
 * it then loops through all the pending outbox
 * t ehcekc if the otubo event matches the required list of events
 * if through, ut sends the evtn wieth the payload.
 * if succesful, it mark as being completed
 * if none it retires
 *
 * ******* DECLARING A FUNCTION THAT STOPS THE OUTBX ACTIONS DURING SERVER SHUTDOWN
 * it basically clear the timeout
 *
 */

import { outboxRepository } from "../repository/OutboxRepository";
import { PRODUCT_ONBOARDING_COMPLETED_TOPIC } from "../constants";
import { IOutboxEventType } from "../models/OutboxEvent";
import logger from "./logger";
import { sendProductMessage } from "../messaging/producer";
const POLL_INTERVAL_MS = 5_000;
const TOPIC_MAP: Record<IOutboxEventType, string> = {
  [IOutboxEventType.PRODUCT_ONBOARDING_COMPLETED_TOPIC]:
    PRODUCT_ONBOARDING_COMPLETED_TOPIC,
};


let pollerTimer: NodeJS.Timeout | null = null;

async function pollOnce(): Promise<void> {
  const events = await outboxRepository.getPendingOutbox();
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

      await sendProductMessage(topic, event.payload);
      await outboxRepository.markOutboxAsProccessed(event._id.toString());

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