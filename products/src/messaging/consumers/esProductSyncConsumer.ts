import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { EsProductSyncTopic } from "../topics/esProductSyncTopics";
import { sendProductMessage } from "../producer";
import {
  ES_PRODUCT_SYNC_CONSUMER_TOPICS,
  BASE_DELAY_MS,
  MAX_RETRIES,
  JITTER,
} from "../../constants";
import logger from "../../utils/logger";
import redisClient from "../../config/redis";

const tracer = trace.getTracer("es-product-sync-consumer");

const kafka = new Kafka({
  clientId: "Products_ES_Sync_Service",
  brokers: ["kafka-1:9092", "kafka-2:9093", "kafka-3:9094"],
  retry: { initialRetryTime: 2000, retries: 30, factor: 2 },
});

const consumer: Consumer = kafka.consumer({
  groupId: "es-product-sync-group",
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  rebalanceTimeout: 60000,
  maxBytesPerPartition: 1_048_576,
  maxWaitTimeInMs: 5000,
  allowAutoTopicCreation: false,
  retry: {
    initialRetryTime: 100,
    retries: 8,
    multiplier: 2,
    maxRetryTime: 30000,
  },
});

export async function connectEsProductSyncConsumer(): Promise<void> {
  const retries = 10;
  for (let i = 0; i < retries; i++) {
    try {
      await consumer.connect();
      await consumer.subscribe({
        topics: ES_PRODUCT_SYNC_CONSUMER_TOPICS,
        fromBeginning: false,
      });
      logger.info("ES product sync consumer connected");
      await startConsuming();
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, (i + 1) * 300));
    }
  }
}

async function startConsuming(): Promise<void> {
  await consumer.run({
    autoCommit: false,
    partitionsConsumedConcurrently: 3,
    eachMessage: async (payload: EachMessagePayload) => {
      const { topic, partition, message, heartbeat } = payload;
      const start = Date.now();

      const rawHeaders = message.headers ?? {};
      const normalizedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (value !== undefined && value !== null) {
          normalizedHeaders[key] = Buffer.isBuffer(value)
            ? value.toString("utf8")
            : String(value);
        }
      }

      const parentContext = propagation.extract(context.active(), normalizedHeaders);

      let data: any;
      try {
        if (!message.value) {
          logger.warn("ES sync: empty message", { topic, partition, offset: message.offset });
          await commitOffset(topic, partition, message.offset);
          return;
        }
        data = JSON.parse(message.value.toString());
      } catch (parseErr) {
        logger.error("ES sync: parse failure", {
          topic,
          partition,
          offset: message.offset,
          error: parseErr,
        });
        await sendToDLQ(topic, partition, message, null, parseErr as Error);
        await commitOffset(topic, partition, message.offset);
        return;
      }

      await context.with(parentContext, async () => {
        const span = tracer.startSpan(`kafka.consume.${topic}`, {
          kind: SpanKind.CONSUMER,
          attributes: {
            "messaging.system": "kafka",
            "messaging.destination": topic,
            "messaging.operation": "receive",
            "messaging.kafka.partition": partition,
            "messaging.kafka.offset": message.offset,
          },
        });

        await context.with(trace.setSpan(context.active(), span), async () => {
          try {
            const handler = EsProductSyncTopic[topic];
            if (!handler) {
              logger.warn("ES sync: no handler for topic", { topic });
              await commitOffset(topic, partition, message.offset);
              span.setStatus({ code: SpanStatusCode.OK });
              return;
            }
            const idempotencyKey = `es-sync:${topic}:${data.productId}:${message.offset}`;
            const acquired = await redisClient.set(
              idempotencyKey,
              "1",
              "EX",
              3600,
              "NX"
            );
            if (!acquired) {
              logger.info("ES sync: duplicate, skipping", { idempotencyKey });
              await commitOffset(topic, partition, message.offset);
              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              return;
            }

            // Exponential backoff retry
            let attempt = 0;
            let lastError: Error | null = null;
            while (attempt < MAX_RETRIES) {
              try {
                await handler(data);
                logger.info("ES sync: message processed", {
                  topic,
                  productId: data.productId,
                  duration: Date.now() - start,
                });
                lastError = null;
                break;
              } catch (err) {
                lastError = err as Error;
                attempt++;
                logger.error(`ES sync: handler error (attempt ${attempt})`, {
                  topic,
                  productId: data.productId,
                  error: lastError.message,
                });
                if (attempt < MAX_RETRIES) {
                  const delay = Math.pow(2, attempt) * BASE_DELAY_MS + JITTER;
                  await new Promise((r) => setTimeout(r, delay));
                }
              }
            }

            if (lastError) {
              span.recordException(lastError);
              span.setStatus({ code: SpanStatusCode.ERROR, message: lastError.message });
              await sendToDLQ(topic, partition, message, data, lastError);
            } else {
              span.setStatus({ code: SpanStatusCode.OK });
            }

            await commitOffset(topic, partition, message.offset);
            await heartbeat();
          } catch (procErr) {
            span.recordException(procErr as Error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: (procErr as Error).message,
            });
            logger.error("ES sync: unhandled error", {
              topic,
              partition,
              offset: message.offset,
              error: procErr,
            });
            await sendToDLQ(topic, partition, message, data, procErr as Error);
            await commitOffset(topic, partition, message.offset);
          } finally {
            span.end();
          }
        });
      });
    },
  });
}

async function commitOffset(
  topic: string,
  partition: number,
  offset: string
): Promise<void> {
  try {
    await consumer.commitOffsets([
      {
        topic,
        partition,
        offset: (BigInt(offset) + BigInt(1)).toString(),
      },
    ]);
  } catch (err) {
    logger.error("ES sync: commit failed", { topic, partition, offset, err });
  }
}

async function sendToDLQ(
  origTopic: string,
  partition: number,
  msg: any,
  parsedData: any,
  err: Error
): Promise<void> {
  try {
    await sendProductMessage("es-product-sync.dlq", {
      originalTopic: origTopic,
      partition,
      offset: msg.offset,
      key: msg.key?.toString(),
      timestamp: msg.timestamp,
      data: parsedData,
      error: { name: err.name, message: err.message, stack: err.stack },
      failedAt: new Date().toISOString(),
    });
    logger.info("ES sync: sent to DLQ", { origTopic, offset: msg.offset });
  } catch (dlqErr) {
    logger.error("ES sync: DLQ write failed", { origTopic, error: dlqErr });
  }
}

export async function disconnectEsProductSyncConsumer(): Promise<void> {
  try {
    await consumer.disconnect();
    logger.info("ES product sync consumer disconnected");
  } catch (err) {
    logger.error("ES sync: disconnect error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}