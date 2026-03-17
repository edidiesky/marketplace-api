/**
 * CDC Kafka Producer — Products Service
 *
 * Dedicated producer for change stream events.
 * Separate from your existing product.onboarding.completed producer
 * so CDC events can be tuned independently.
 *
 * Topic: product.cdc.events
 * Key:   productId — ensures all events for a product go to the same partition
 *                     guaranteeing per-product ordering in consumers
 *
 * Delivery guarantee:
 *   acks: -1 (all ISR brokers must acknowledge)
 *   idempotent: true  (exactly-once producer semantics)
 *   retries: 5 with backoff
 *
 * If publish fails after all retries:
 *   The watcher does NOT save the resume token.
 *   On watcher restart (or reconnect after error), the event is replayed.
 *   This gives at-least-once delivery end-to-end.
 */

import { Kafka, Producer, Partitioners, CompressionTypes, logLevel } from "kafkajs";
import logger from "../utils/logger";
import { ProductCDCEvent } from "../watcher/cdcEventBuilder";

//  Constants ─

export const CDC_TOPIC = "product.cdc.events";
const MAX_PUBLISH_RETRIES = 5;
const RETRY_BASE_MS = 300;

//  Kafka Client ─

const kafka = new Kafka({
  clientId: "products-service-cdc-producer",
  brokers: [
    process.env.KAFKA_BROKER_1 || "kafka-1:9092",
    process.env.KAFKA_BROKER_2 || "kafka-2:9093",
    process.env.KAFKA_BROKER_3 || "kafka-3:9094",
  ],
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 500,
    retries: 8,
    factor: 2,
    maxRetryTime: 30_000,
  },
});

let producer: Producer | null = null;
let isConnected = false;

//  Lifecycle ─

export async function connectCDCProducer(): Promise<void> {
  if (isConnected) return;

  producer = kafka.producer({
    createPartitioner: Partitioners.DefaultPartitioner,
    allowAutoTopicCreation: false,
    idempotent: true,           // exactly-once at the producer level
    maxInFlightRequests: 5,     // max 5 in-flight requests (required for idempotent)
    transactionTimeout: 30_000,
  });

  let attempt = 0;
  const maxAttempts = 10;

  while (attempt < maxAttempts) {
    try {
      await producer.connect();
      isConnected = true;
      logger.info("CDC Kafka producer connected", { topic: CDC_TOPIC });
      return;
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts) {
        throw new Error(
          `CDC producer failed to connect after ${maxAttempts} attempts: ${
            err instanceof Error ? err.message : err
          }`
        );
      }
      const delay = Math.min(RETRY_BASE_MS * Math.pow(2, attempt), 10_000);
      logger.warn(`CDC producer connect attempt ${attempt} failed — retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
}

export async function disconnectCDCProducer(): Promise<void> {
  if (!producer || !isConnected) return;
  try {
    await producer.disconnect();
    isConnected = false;
    logger.info("CDC Kafka producer disconnected");
  } catch (err) {
    logger.error("Error disconnecting CDC producer", {
      error: err instanceof Error ? err.message : err,
    });
  }
}

//  Publish 

/**
 * Publish a CDC event to Kafka.
 *
 * Throws on failure after all retries.
 * The caller (changeStreamWatcher) must NOT save the resume token if this throws.
 */
export async function publishCDCEvent(event: ProductCDCEvent): Promise<void> {
  if (!producer || !isConnected) {
    throw new Error("CDC producer is not connected — cannot publish event");
  }

  let attempt = 0;

  while (attempt <= MAX_PUBLISH_RETRIES) {
    try {
      const result = await producer.send({
        topic: CDC_TOPIC,
        messages: [
          {
            key: event.productId,

            value: JSON.stringify(event),

            headers: {
              "event-version": event.eventVersion,
              "event-id": event.eventId,
              "operation": event.operation,
              "source": event.source,
              "occurred-at": event.occurredAt,
              "product-id": event.productId,
              ...(event.storeId ? { "store-id": event.storeId } : {}),
            },
          },
        ],
        // All ISR brokers must acknowledge before we consider this written
        acks: -1,
        timeout: 15_000,
        compression: CompressionTypes.GZIP,
      });

      logger.info("CDC event published to Kafka", {
        topic: CDC_TOPIC,
        partition: result[0]?.partition,
        offset: result[0]?.offset,
        operation: event.operation,
        productId: event.productId,
        eventId: event.eventId,
      });

      return; // success
    } catch (err) {
      attempt++;

      if (attempt > MAX_PUBLISH_RETRIES) {
        logger.error("CDC event publish failed after all retries", {
          eventId: event.eventId,
          operation: event.operation,
          productId: event.productId,
          error: err instanceof Error ? err.message : err,
          attempts: attempt,
        });
        throw err; 
      }

      const delay = Math.min(RETRY_BASE_MS * Math.pow(2, attempt), 10_000);
      logger.warn(`CDC publish attempt ${attempt} failed — retrying in ${delay}ms`, {
        eventId: event.eventId,
        error: err instanceof Error ? err.message : err,
      });
      await sleep(delay);
    }
  }
}

//  Helpers 

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}