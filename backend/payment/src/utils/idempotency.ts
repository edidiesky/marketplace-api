import crypto            from "crypto";
import mongoose, { Types } from "mongoose";
import logger            from "./logger";
import { SERVICE_NAME }  from "../constants";
import idempotencyModel, { IIdempotencyKey } from "../domains/wallet/idempotency.model";

export const idempotencyRepository = {
  buildHash(
    method:   string,
    endpoint: string,
    userId:   string,
    body:     Record<string, unknown>
  ): string {
    const raw = `${method}:${endpoint}:${userId}:${JSON.stringify(body)}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  },

  async find(requestHash: string): Promise<IIdempotencyKey | null> {
    try {
      return await idempotencyModel.findOne({ requestHash }).lean().exec();
    } catch (err) {
      logger.warn("idempotency_key_lookup_failed", {
        event:       "idempotency_key_lookup_failed",
        service:     SERVICE_NAME,
        requestHash,
        error:       err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },

  async save(
    data: {
      requestHash:  string;
      endpoint:     string;
      userId:       Types.ObjectId;
      paymentId?:   string;
      responseBody: Record<string, unknown>;
      statusCode:   number;
    },
    session?: mongoose.ClientSession
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await idempotencyModel.create([{ ...data, expiresAt }], { session });
    } catch (err) {
      const error = err as { code?: number };
      if (error.code !== 11000) {
        logger.warn("idempotency_key_save_failed", {
          event:       "idempotency_key_save_failed",
          service:     SERVICE_NAME,
          requestHash: data.requestHash,
          error:       err instanceof Error ? err.message : String(err),
        });
      }
    }
  },
};