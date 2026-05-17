import { outboxRepository }  from "../domains/outbox/outbox.repository";
import { OutboxEventType }   from "../domains/outbox/outbox.model";
import {
  publishPaymentCompleted,
  publishPaymentFailed,
  publishPaymentInitiated,
} from "../messaging/publisher";
import logger                from "./logger";
import { SERVICE_NAME, POLL_INTERVAL_MS } from "../constants";

type OutboxPublisher = (payload: Record<string, unknown>) => void;

const PUBLISHER_MAP: Record<OutboxEventType, OutboxPublisher> = {
  [OutboxEventType.PAYMENT_CONFIRMED]: publishPaymentCompleted,
  [OutboxEventType.PAYMENT_FAILED]:    publishPaymentFailed,
  [OutboxEventType.PAYMENT_INITIATED]: publishPaymentInitiated,
};

let pollerTimer: NodeJS.Timeout | null = null;

async function pollOnce(): Promise<void> {
  const events = await outboxRepository.getPending();
  if (events.length === 0) return;

  logger.info("outbox_poller_processing", {
    event:   "outbox_poller_processing",
    service: SERVICE_NAME,
    count:   events.length,
  });

  for (const event of events) {
    try {
      const publisher = PUBLISHER_MAP[event.type];

      if (!publisher) {
        logger.error("outbox_unknown_event_type", {
          event:   "outbox_unknown_event_type",
          service: SERVICE_NAME,
          type:    event.type,
          eventId: event._id.toString(),
        });
        await outboxRepository.incrementRetry(
          event._id.toString(),
          `Unknown event type: ${event.type}`
        );
        continue;
      }

      publisher(event.payload);
      await outboxRepository.markProcessed(event._id.toString());

      logger.info("outbox_event_published", {
        event:   "outbox_event_published",
        service: SERVICE_NAME,
        type:    event.type,
        eventId: event._id.toString(),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.error("outbox_event_publish_failed", {
        event:   "outbox_event_publish_failed",
        service: SERVICE_NAME,
        type:    event.type,
        eventId: event._id.toString(),
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
      logger.error("outbox_poller_error", {
        event:   "outbox_poller_error",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }
  }, POLL_INTERVAL_MS);

  logger.info("outbox_poller_started", {
    event:      "outbox_poller_started",
    service:    SERVICE_NAME,
    intervalMs: POLL_INTERVAL_MS,
  });
}

export function stopOutboxPoller(): void {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
    logger.info("outbox_poller_stopped", {
      event:   "outbox_poller_stopped",
      service: SERVICE_NAME,
    });
  }
}