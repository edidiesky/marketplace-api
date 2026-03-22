import OutboxEvent, {
  IOutboxEvent,
  OutboxEventStatus,
  OutboxEventType,
} from "../models/OutboxEvent";
import mongoose from "mongoose";
import logger from "../utils/logger";

const MAX_RETRIES = 3;

export class OutboxRepository {
  async create(
    type: OutboxEventType,
    payload: Record<string, any>,
    session: mongoose.ClientSession
  ): Promise<IOutboxEvent> {
    const [event] = await OutboxEvent.create([{ type, payload }], { session });
    return event;
  }

  async getPending(): Promise<IOutboxEvent[]> {
    return OutboxEvent.find({
      status: OutboxEventStatus.PENDING,
      retryCount: { $lt: MAX_RETRIES },
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .exec();
  }

  async markProcessed(id: string): Promise<void> {
    await OutboxEvent.findByIdAndUpdate(id, {
      $set: {
        status: OutboxEventStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }

  async incrementRetry(id: string, error: string): Promise<void> {
    const event = await OutboxEvent.findById(id);
    if (!event) return;

    const nextRetry = event.retryCount + 1;
    await OutboxEvent.findByIdAndUpdate(id, {
      $set: {
        retryCount: nextRetry,
        lastError: error,
        status:
          nextRetry >= MAX_RETRIES
            ? OutboxEventStatus.DEAD
            : OutboxEventStatus.PENDING,
      },
    });

    if (nextRetry >= MAX_RETRIES) {
      logger.error("Outbox event moved to DEAD after max retries", {
        id,
        error,
      });
    }
  }
}

export const outboxRepository = new OutboxRepository();