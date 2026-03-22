import crypto from "crypto";
import IdempotencyKey, { IIdempotencyKey } from "../models/IdempotencyKey";
import logger from "../utils/logger";
import mongoose, { Types } from "mongoose";

export class IdempotencyRepository {
  static buildHash(
    method: string,
    endpoint: string,
    userId: string,
    body: Record<string, any>,
  ): string {
    const raw = `${method}:${endpoint}:${userId}:${JSON.stringify(body)}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  async find(requestHash: string): Promise<IIdempotencyKey | null> {
    try {
      return await IdempotencyKey.findOne({ requestHash }).lean().exec();
    } catch (err) {
      logger.warn("Idempotency key lookup failed", { requestHash });
      return null;
    }
  }

  async save(
    data: {
      requestHash: string;
      endpoint: string;
      userId: Types.ObjectId;
      paymentId?: string;
      responseBody: Record<string, any>;
      statusCode: number;
    },
    session?: mongoose.ClientSession,
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await IdempotencyKey.create([{ ...data, expiresAt }], { session });
    } catch (err: any) {
      if (err.code !== 11000) {
        logger.warn("Failed to save idempotency key", {
          requestHash: data.requestHash,
          userId: data.userId,
          paymentId: data.paymentId,
        });
      }
    }
  }
}

export const idempotencyRepository = new IdempotencyRepository();
