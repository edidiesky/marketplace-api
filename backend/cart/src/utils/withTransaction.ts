import mongoose from "mongoose";
import logger from "./logger";
import { SERVICE_NAME } from "../constants";

export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();

  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    logger.error("transaction_aborted", {
      event:   "transaction_aborted",
      service: SERVICE_NAME,
      error:   err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    session.endSession();
  }
}