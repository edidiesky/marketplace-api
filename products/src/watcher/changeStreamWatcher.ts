/**
 * Product Change Stream Watcher
 *
 * Watches the MongoDB `products` collection for changes and publishes
 * structured CDC events to Kafka topic `product.cdc.events`.
 *
 * Lifecycle:
 *   start()  → called once in server.ts after MongoDB + Kafka are ready
 *   stop()   → called in graceful shutdown (SIGTERM / SIGINT)
 *
 * Restart behaviour:
 *   On MongoDB connection error, the watcher closes and re-opens with
 *   exponential backoff. The resume token is saved so no events are missed.
 *
 * Important constraint (M0 Free Tier):
 *   Atlas M0 does NOT allow configuring oplog retention.
 *   Default retention can be as low as a few hours under write pressure.
 *   If the watcher is DOWN for longer than the oplog retention window,
 *   the resume token becomes invalid. The watcher detects this
 *   (ChangeStreamHistoryLost error) and restarts from "now",
 *   logging a critical alert. You MUST have monitoring on this.
 */

import mongoose from "mongoose";
import { ChangeStream, ChangeStreamDocument, Collection } from "mongodb";
import logger from "../utils/logger";
import {
  loadResumeToken,
  saveResumeToken,
  forceFlushResumeToken,
  startFlushTimer,
  stopFlushTimer,
  setRedisClient,
  ResumeToken,
} from "./resumeTokenStore";
import { buildCDCEvent, ProductCDCEvent } from "./cdcEventBuilder";
import { publishCDCEvent } from "../messaging/cdcProducer";
import redisClient from "../config/redis";
import { getMongoDb } from "../utils/connectDB";

//  Configuration 

const COLLECTION_NAME = "products";

// DB_NAME is no longer needed here.
// mongoose.connection.db is set by your connectMongoDB utility and already
// points to the correct database from DATABASE_URL.
// Using client.db(DB_NAME) would bypass the configured connection pool
// (minPoolSize:10, maxPoolSize:50) and could reference the wrong database.

// Pipeline: only watch operations we care about
// 'drop', 'rename', 'invalidate' are excluded — they are cluster-level events
const WATCH_PIPELINE = [
  {
    $match: {
      operationType: { $in: ["insert", "update", "delete", "replace"] },
    },
  },
];

// Reconnect backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 20;

//  State 

let changeStream: ChangeStream | null = null;
let isRunning = false;
let reconnectAttempts = 0;
let reconnectTimer: NodeJS.Timeout | null = null;

// Metrics (exposed via /health endpoint)
export const watcherMetrics = {
  totalEventsProcessed: 0,
  totalEventsPublished: 0,
  totalPublishErrors: 0,
  totalReconnects: 0,
  lastEventAt: null as Date | null,
  lastReconnectAt: null as Date | null,
  isRunning: false,
  resumeTokenAge: null as number | null, // ms since last token save
};

//  Core Watcher 

async function openChangeStream(
  resumeToken: ResumeToken | null
): Promise<void> {
  // getMongoDb() uses the connection your connectMongoDB utility established.
  // It checks readyState===1 before returning — throws a clear error if called
  // before the connection is ready or after a disconnect.
  // This is the correct replacement for mongoose.connection.client.db(DB_NAME)
  // which would bypass your configured pool and could target the wrong database.
  const collection: Collection = getMongoDb().collection(COLLECTION_NAME);

  const options: any = {
    // fullDocument: "updateLookup" — on UPDATE events, MongoDB fetches the
    // complete current document and includes it in the event.
    // Without this, UPDATE events only contain the diff (changed fields).
    // Trade-off: extra read from MongoDB on every update. Acceptable — the
    // read hits the primary and is served from memory for hot documents.
    fullDocument: "updateLookup",

    // fullDocumentBeforeChange: "whenAvailable" — include the document
    // state BEFORE the change (requires changeStreamPreAndPostImages on the collection).
    // Skipping this for M0 (requires collection-level config).
    // fullDocumentBeforeChange: "whenAvailable",

    // batchSize: how many change events to fetch per network round trip.
    // Higher = fewer round trips = better throughput.
    // Lower = lower latency per event.
    batchSize: 100,
  };

  // Resume from stored token — this is what prevents missing events on restart
  if (resumeToken) {
    options.resumeAfter = resumeToken;
    logger.info("Opening change stream with resume token", {
      tokenPrefix: resumeToken._data?.substring(0, 20),
    });
  } else {
    // No token — start from current oplog position
    // Events that happened BEFORE the watcher started are NOT replayed
    options.startAtOperationTime = new mongoose.mongo.Timestamp({
      t: Math.floor(Date.now() / 1000),
      i: 0,
    });
    logger.info("Opening change stream from current position (no resume token)");
  }

  changeStream = collection.watch(WATCH_PIPELINE, options);
  watcherMetrics.isRunning = true;

  //  Event handler 

  changeStream.on("change", async (change: ChangeStreamDocument) => {
    watcherMetrics.totalEventsProcessed++;
    watcherMetrics.lastEventAt = new Date();

    const rawToken = change._id as ResumeToken;

    try {
      // Build our clean CDC event from the raw MongoDB change document
      const event = buildCDCEvent(change);

      if (!event) {
        // Unhandled operation type (drop, invalidate etc.) — save token and skip
        await saveResumeToken(rawToken);
        return;
      }

      logger.debug("Change stream event received", {
        operation: event.operation,
        productId: event.productId,
        storeId: event.storeId,
      });

      // Publish to Kafka BEFORE saving the resume token.
      // If publish succeeds → save token → event is guaranteed delivered.
      // If publish fails  → do NOT save token → event will be retried on next restart.
      // This gives us at-least-once delivery semantics.
      await publishCDCEvent(event);

      watcherMetrics.totalEventsPublished++;

      // Save resume token AFTER successful publish
      await saveResumeToken(rawToken);
    } catch (err) {
      watcherMetrics.totalPublishErrors++;

      logger.error("Failed to process change stream event", {
        operation: (change as any).operationType,
        documentKey: JSON.stringify((change as any).documentKey),
        error: err instanceof Error ? err.message : err,
      });

      // Do NOT save the resume token on failure.
      // The watcher will close on the next error event and reconnect.
      // When it reconnects with the last saved token, this event is replayed.

      // Close the stream — the error handler will schedule reconnect
      if (changeStream && !changeStream.closed) {
        await changeStream.close();
      }
    }
  });

  //  Error handler 

  changeStream.on("error", async (err: Error) => {
    watcherMetrics.isRunning = false;

    const isHistoryLost =
      err.message?.includes("ChangeStreamHistoryLost") ||
      (err as any).code === 286;

    if (isHistoryLost) {
      // CRITICAL: Resume token is no longer valid.
      // The oplog rolled past the stored position.
      // We MUST clear the token and restart from "now".
      // Events between the last valid token and now are LOST.
      logger.error(
        "CRITICAL: ChangeStreamHistoryLost — oplog rolled past resume token. " +
        "Events may have been missed. Clearing token and restarting from current position. " +
        "Increase oplog retention or upgrade to M10+ to prevent this.",
        { error: err.message }
      );

      // Clear the stale token
      try {
        await redisClient.del("products:changestream:resumetoken");
        await getMongoDb().collection("watcher_state").deleteOne({
          _id: "products_change_stream" as any,
        });
      } catch {}

      scheduleReconnect(null);
      return;
    }

    const isNetworkError =
      err.message?.includes("ECONNRESET") ||
      err.message?.includes("connection") ||
      err.message?.includes("topology");

    if (isNetworkError) {
      logger.warn("Change stream network error — will reconnect", {
        error: err.message,
        attempt: reconnectAttempts,
      });
    } else {
      logger.error("Change stream error", {
        error: err.message,
        code: (err as any).code,
      });
    }

    scheduleReconnect(null);
  });

  //  Close handler 

  changeStream.on("close", () => {
    watcherMetrics.isRunning = false;
    logger.info("Change stream closed");

    // Only reconnect if we intended to keep running
    if (isRunning) {
      scheduleReconnect(null);
    }
  });

  logger.info("Change stream opened successfully", {
    collection: COLLECTION_NAME,
    database: mongoose.connection.db?.databaseName ?? 'unknown',
    hasResumeToken: !!resumeToken,
  });
}

//  Reconnect Logic 

function scheduleReconnect(overrideToken: ResumeToken | null): void {
  if (!isRunning) return;
  if (reconnectTimer) return; // already scheduled

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error(
      `CRITICAL: Change stream failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts. ` +
      "Manual intervention required. Check MongoDB Atlas connectivity.",
      { reconnectAttempts }
    );
    return;
  }

  const backoffMs = Math.min(
    BASE_BACKOFF_MS * Math.pow(2, reconnectAttempts),
    MAX_BACKOFF_MS
  );

  reconnectAttempts++;
  watcherMetrics.totalReconnects++;
  watcherMetrics.lastReconnectAt = new Date();

  logger.info(`Scheduling change stream reconnect`, {
    attempt: reconnectAttempts,
    backoffMs,
  });

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    try {
      const token = overrideToken ?? (await loadResumeToken());
      await openChangeStream(token);
      reconnectAttempts = 0; // reset on success
    } catch (err) {
      logger.error("Reconnect attempt failed", {
        attempt: reconnectAttempts,
        error: err instanceof Error ? err.message : err,
      });
      scheduleReconnect(null);
    }
  }, backoffMs);
}

//  Public API 

/**
 * Start the change stream watcher.
 * Call this in server.ts AFTER MongoDB and Kafka are connected.
 */
export async function startChangeStreamWatcher(): Promise<void> {
  if (isRunning) {
    logger.warn("Change stream watcher already running — ignoring start call");
    return;
  }

  isRunning = true;
  setRedisClient(redisClient);

  logger.info("Starting product change stream watcher", {
    collection: COLLECTION_NAME,
    database: mongoose.connection.db?.databaseName ?? 'unknown',
  });

  try {
    startFlushTimer();
    const resumeToken = await loadResumeToken();
    await openChangeStream(resumeToken);
  } catch (err) {
    logger.error("Failed to start change stream watcher", {
      error: err instanceof Error ? err.message : err,
    });
    // Schedule reconnect — do not throw (server should still start)
    scheduleReconnect(null);
  }
}

/**
 * Stop the change stream watcher cleanly.
 * Call this in graceful shutdown.
 */
export async function stopChangeStreamWatcher(): Promise<void> {
  isRunning = false;
  watcherMetrics.isRunning = false;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  stopFlushTimer();

  if (changeStream && !changeStream.closed) {
    try {
      await changeStream.close();
      logger.info("Change stream closed cleanly");
    } catch (err) {
      logger.error("Error closing change stream", {
        error: err instanceof Error ? err.message : err,
      });
    }
  }

  // Force-flush the resume token so the next startup replays as little as possible
  await forceFlushResumeToken();
}

/**
 * Health check data for the /health endpoint.
 */
export function getWatcherHealth(): Record<string, any> {
  return {
    ...watcherMetrics,
    reconnectAttempts,
    changeStreamOpen: changeStream ? !changeStream.closed : false,
  };
}