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
    const [event] = await OutboxEvent.create(
      [{ type, payload, status: OutboxEventStatus.PENDING }],
      { session }
    );
    return event;
  },

  async getPending(): Promise<IOutboxEvent[]> {
    return OutboxEvent.find({
      status: OutboxEventStatus.PENDING,
    })
      .lean<IOutboxEvent[]>()
      .exec();
  },

  async markCompleted(id: string): Promise<void> {
    await OutboxEvent.findByIdAndUpdate(id, {
      $set: {
        status:      OutboxEventStatus.COMPLETED,
        processedAt: new Date(),
      },
    }).exec();
  },

  async incrementRetry(id: string, error: string): Promise<void> {
    const event = await OutboxEvent.findById(id).exec();
    if (!event) {
      logger.warn("outbox_event_not_found_for_retry", {
        event:   "outbox_event_not_found_for_retry",
        service: SERVICE_NAME,
        id,
      });
      return;
    }

    const nextStatus =
      event.retryCount >= MAX_RETRIES
        ? OutboxEventStatus.DEAD
        : OutboxEventStatus.PENDING;

    await OutboxEvent.findByIdAndUpdate(id, {
      $set: { lastError: error, status: nextStatus },
      $inc: { retryCount: 1 },
    }).exec();
  },
};