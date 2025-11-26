import { IProduct } from "../models/Product";
import mongoose from "mongoose";
import logger from "./logger";

export const withTransaction = async (
  fn: (session: mongoose.ClientSession) => Promise<IProduct>
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    if (error instanceof Error) {
      logger.error("Transaction error", {
        message: error.message,
        stack: error.stack,
      });
    }
    throw error;
  } finally {
    await session.endSession();
  }
};
