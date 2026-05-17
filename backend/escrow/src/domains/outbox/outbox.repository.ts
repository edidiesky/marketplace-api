import mongoose from "mongoose";
import OutboxEvent, {
  IOutboxEvent,
  OutboxEventStatus,
  OutboxEventType,
} from "./outbox.model";
import logger from "../../utils/logger";
import { MAX_RETRIES, SERVICE_NAME } from "../../constants";

export const outboxRepository = {
  async create(
    type:    OutboxEventType,
    payload: Record<string, unknown>,
    session: mongoose.ClientSession
  ): Promise<IOutboxEvent> {
    const [event] = await OutboxEvent.create([{ type, payload }], { session });
    return event;
  },

  async getPending(): Promise<IOutboxEvent[]> {
    return OutboxEvent.find({
      status:     OutboxEventStatus.PENDING,
      retryCount: { $lt: MAX_RETRIES },
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean<IOutboxEvent[]>()
      .exec();
  },

  async markProcessed(id: string): Promise<void> {
    await OutboxEvent.findByIdAndUpdate(id, {
      $set: {
        status:      OutboxEventStatus.PROCESSED,
        processedAt: new Date(),
      },
    }).exec();
  },

  async incrementRetry(id: string, error: string): Promise<void> {
    const event = await OutboxEvent.findById(id).exec();
    if (!event) return;

    const nextRetry    = event.retryCount + 1;
    const nextStatus   =
      nextRetry >= MAX_RETRIES
        ? OutboxEventStatus.DEAD
        : OutboxEventStatus.PENDING;

    await OutboxEvent.findByIdAndUpdate(id, {
      $set: {
        retryCount: nextRetry,
        lastError:  error,
        status:     nextStatus,
      },
    }).exec();

    if (nextStatus === OutboxEventStatus.DEAD) {
      logger.error("outbox_event_dead", {
        event:   "outbox_event_dead",
        service: SERVICE_NAME,
        id,
        error,
      });
    }
  },
};