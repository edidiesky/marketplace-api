import { IProduct } from "../models/Product";
import mongoose from "mongoose";
import logger from "./logger";

export async function withTransaction<T>(
  fn: (session: mongoose.mongo.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    logger.error("Transaction aborted", {
      message:
        error instanceof Error
          ? error.message
          : "An iunknown error did occurred during the transaction abortion",
      stack:
        error instanceof Error
          ? error.stack
          : "An iunknown error did occurred during the transaction abortion",
    });
    throw error;
  } finally {
    session.endSession();
  }
}
