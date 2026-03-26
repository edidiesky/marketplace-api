import mongoose from "mongoose";
import OutboxEvent, {
  IOutboxEvent,
  IOutboxEventStatus,
  IOutboxEventType,
} from "../models/OutboxEvent";
import { IOutboxRepo } from "../types";
import logger from "../utils/logger";
import { MAX_RETRIES } from "../constants";

export class OutboxClass implements IOutboxRepo {
  async createOutbox(
    type: IOutboxEventType,
    payload: Record<string, any>,
    session: mongoose.ClientSession,
  ): Promise<IOutboxEvent> {
    const event = await OutboxEvent.create(
      [
        {
          type,
          payload,
          status: IOutboxEventStatus.PENDING,
        },
      ],
      { session },
    );
    return event[0];
  }
  async getPendingOutbox(): Promise<IOutboxEvent[]> {
    return await OutboxEvent.find({
      status: IOutboxEventStatus.PENDING,
    });
  }
  async incrementRetry(id: string, error: string): Promise<void> {
    // find the curre event
    let event = await OutboxEvent.findById(id);
    if (!event) {
      logger.warn("The event does not exists", {
        id,
        error,
      });
      return;
    }
    // increase the retrun count, and store the error
    await OutboxEvent.findOneAndUpdate(
      { id, __v: event.__v },
      {
        $set: {
          lastError: error,
          status:
            event.retryCount >= MAX_RETRIES
              ? IOutboxEventStatus.DEAD
              : IOutboxEventStatus.PENDING,
        },
        $inc: {
          retryCount: 1,
        },
      },
    );
    // if more than mark as dead
  }
  async markOutboxAsProccessed(id: string): Promise<IOutboxEvent | null> {
    return await OutboxEvent.findByIdAndUpdate(id, {
      $set: {
        status: IOutboxEventStatus.COMPLETED,
      },
    });
  }
}


export const outboxRepository = new OutboxClass()