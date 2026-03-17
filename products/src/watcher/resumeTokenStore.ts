/**
 * Resume Token Store
 *
 * The resume token is the change stream's bookmark — it tells MongoDB
 * "give me all changes AFTER this point". Without it, a service restart
 * means you either replay ALL changes from the beginning (expensive)
 * or miss all changes that happened while the service was down (data loss).
 *
 * Storage strategy:
 *   Primary:  Redis  (fast read on startup, ~0.1ms)
 *   Fallback: MongoDB `watcher_state` collection (survives Redis restart)
 *
 * Write strategy:
 *   Write to Redis on EVERY event (cheap).
 *   Write to MongoDB every 30 events OR every 10 seconds (whichever first).
 *   This limits MongoDB writes while still bounding the replay window on failure.
 */

import mongoose from "mongoose";
import logger from "../utils/logger";
import { getMongoDb } from "../utils/connectDB";

//  Types

export interface ResumeToken {
  _data: string;
  [key: string]: any;
}

//  Configuration 

const REDIS_KEY = "products:changestream:resumetoken";
const MONGO_COLLECTION = "watcher_state";
const MONGO_DOC_ID = "products_change_stream";

// Flush to MongoDB every N events or every N milliseconds
const MONGO_FLUSH_EVERY_N_EVENTS = 30;
const MONGO_FLUSH_EVERY_MS = 10_000;

//  State

let eventsSinceLastFlush = 0;
let lastFlushTime = Date.now();
let pendingToken: ResumeToken | null = null;
let flushTimer: NodeJS.Timeout | null = null;

//  Redis Client (imported from your existing config)

let redisClient: any;

export function setRedisClient(client: any): void {
  redisClient = client;
}

//  Read 

/**
 * Load the resume token on startup.
 * Tries Redis first (fast), falls back to MongoDB (durable).
 * Returns null if no token exists — watcher will start from "now".
 */
export async function loadResumeToken(): Promise<ResumeToken | null> {
  // Try Redis first
  try {
    const raw = await redisClient.get(REDIS_KEY);
    if (raw) {
      const token = JSON.parse(raw) as ResumeToken;
      logger.info("Resume token loaded from Redis", {
        tokenPrefix: token._data?.substring(0, 20),
      });
      return token;
    }
  } catch (err) {
    logger.warn("Failed to load resume token from Redis — trying MongoDB", {
      error: err instanceof Error ? err.message : err,
    });
  }

  // Fallback: MongoDB
  try {
    const doc = await getMongoDb()
      .collection(MONGO_COLLECTION)
      .findOne({ _id: MONGO_DOC_ID as any });

    if (doc?.resumeToken) {
      logger.info("Resume token loaded from MongoDB (Redis was empty/down)", {
        tokenPrefix: doc.resumeToken._data?.substring(0, 20),
        savedAt: doc.savedAt,
      });

      // Restore to Redis so next startup is fast
      try {
        await redisClient.set(REDIS_KEY, JSON.stringify(doc.resumeToken));
      } catch {}

      return doc.resumeToken as ResumeToken;
    }
  } catch (err) {
    logger.error("Failed to load resume token from MongoDB", {
      error: err instanceof Error ? err.message : err,
    });
  }

  logger.info(
    "No resume token found — change stream will start from current position"
  );
  return null;
}

//  Write

/**
 * Save the resume token after processing each event.
 * Redis write is synchronous (fast path).
 * MongoDB write is batched (every N events or N seconds).
 */
export async function saveResumeToken(token: ResumeToken): Promise<void> {
  pendingToken = token;
  eventsSinceLastFlush++;

  // Always write to Redis immediately
  try {
    await redisClient.set(REDIS_KEY, JSON.stringify(token));
  } catch (err) {
    logger.warn("Failed to save resume token to Redis", {
      error: err instanceof Error ? err.message : err,
    });
  }

  // Flush to MongoDB if threshold reached
  const shouldFlush =
    eventsSinceLastFlush >= MONGO_FLUSH_EVERY_N_EVENTS ||
    Date.now() - lastFlushTime >= MONGO_FLUSH_EVERY_MS;

  if (shouldFlush) {
    await flushTokenToMongo(token);
  }
}

async function flushTokenToMongo(token: ResumeToken): Promise<void> {
  try {
    await getMongoDb().collection(MONGO_COLLECTION).updateOne(
      { _id: MONGO_DOC_ID as any },
      {
        $set: {
          resumeToken: token,
          savedAt: new Date(),
          eventCount: eventsSinceLastFlush,
        },
      },
      { upsert: true }
    );

    eventsSinceLastFlush = 0;
    lastFlushTime = Date.now();

    logger.debug("Resume token flushed to MongoDB");
  } catch (err) {
    // Non-fatal — Redis still has the token
    logger.warn("Failed to flush resume token to MongoDB", {
      error: err instanceof Error ? err.message : err,
    });
  }
}

/**
 * Force-flush on graceful shutdown to minimise replay window.
 */
export async function forceFlushResumeToken(): Promise<void> {
  if (pendingToken) {
    logger.info("Force-flushing resume token on shutdown");
    await flushTokenToMongo(pendingToken);
  }
}

/**
 * Start the periodic MongoDB flush timer.
 * Call this once after the watcher starts.
 */
export function startFlushTimer(): void {
  flushTimer = setInterval(async () => {
    if (pendingToken && eventsSinceLastFlush > 0) {
      await flushTokenToMongo(pendingToken);
    }
  }, MONGO_FLUSH_EVERY_MS);

  // Don't block process exit
  if (flushTimer.unref) flushTimer.unref();
}

export function stopFlushTimer(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}