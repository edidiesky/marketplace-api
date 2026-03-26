import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import logger from "../../utils/logger";
import { PaymentTopic } from "./topics";
import { sendPaymentMessage } from "./producer";
import { PAYMENT_CONSUMER_TOPICS } from "../../constants";
import { context, propagation, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("payment-consumer");

const kafka = new Kafka({
  clientId: "Payment_Service",
  brokers: ["kafka-1:9092", "kafka-2:9093", "kafka-3:9094"],
  retry: { initialRetryTime: 2000, retries: 30, factor: 2 },
});

const consumer: Consumer = kafka.consumer({
  groupId: "Payment-group",
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

export async function connectConsumer() {
  const retries = 10;
  for (let i = 0; i < retries; i++) {
    try {
      await consumer.connect();
      await consumer.subscribe({
        topics: PAYMENT_CONSUMER_TOPICS,
        fromBeginning: false,
      });
      logger.info("Payment consumer connected");
      await startConsuming();
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, (i + 1) * 300));
    }
  }
}

async function startConsuming() {
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
          logger.warn("Empty message", { topic, partition, offset: message.offset });
          await commitOffset(topic, partition, message.offset);
          return;
        }
        data = JSON.parse(message.value.toString());
      } catch (parseErr) {
        logger.error("Failed to parse message", { topic, partition, offset: message.offset, error: parseErr });
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
            logger.info("Processing message", {
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString(),
            });

            const handler = PaymentTopic[topic as keyof typeof PaymentTopic];
            if (!handler) {
              logger.warn("No handler for topic", { topic });
              await commitOffset(topic, partition, message.offset);
              span.setStatus({ code: SpanStatusCode.OK });
              return;
            }

            await handler(data);
            await commitOffset(topic, partition, message.offset);
            await heartbeat();

            span.setStatus({ code: SpanStatusCode.OK });
            logger.info("Message processed", { topic, duration: Date.now() - start });
          } catch (procErr) {
            span.recordException(procErr as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (procErr as Error).message });
            logger.error("Handler failed", { topic, partition, offset: message.offset, error: procErr });
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

async function commitOffset(topic: string, partition: number, offset: string) {
  try {
    await consumer.commitOffsets([
      { topic, partition, offset: (BigInt(offset) + BigInt(1)).toString() },
    ]);
  } catch (err) {
    logger.error("Commit failed", { topic, partition, offset, err });
  }
}

async function sendToDLQ(origTopic: string, partition: number, msg: any, parsedData: any, err: Error) {
  try {
    await sendPaymentMessage("Payment.dlq", {
      originalTopic: origTopic,
      partition,
      offset: msg.offset,
      key: msg.key?.toString(),
      timestamp: msg.timestamp,
      data: parsedData,
      error: { name: err.name, message: err.message, stack: err.stack },
      failedAt: new Date().toISOString(),
    });
    logger.info("Sent to DLQ", { origTopic, offset: msg.offset });
  } catch (dlqErr) {
    logger.error("DLQ failed", { origTopic, error: dlqErr });
  }
}

export async function disconnectConsumer() {
  try {
    await consumer.disconnect();
    logger.info("Consumer disconnected");
  } catch (error) {
    logger.error("Error disconnecting payment consumer", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "Unknown error",
    });
  }
}