import { Kafka, logLevel, Consumer } from "kafkajs";
import logger from "../utils/logger";
import { PaymentTopic } from "./topics";
import { sendPaymentMessage } from "./producer";

const kafka = new Kafka({
  clientId: "Payment_Service",
  brokers: ["kafka-1:9092", "kafka-2:9093", "kafka-3:9094"],
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 2000,
    retries: 30,
    factor: 2,
  },
});

// Consumer group
const consumer: Consumer = kafka.consumer({
  groupId: "Payment-group",
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  rebalanceTimeout: 60000,
  maxBytesPerPartition: 1048576,
  maxWaitTimeInMs: 5000,
  allowAutoTopicCreation: false,
  retry: {
    initialRetryTime: 100,
    retries: 8,
    multiplier: 2,
    maxRetryTime: 30000,
  },
});

/**
 * Connect and start consuming
 */
export async function connectConsumer() {
  const retries = 10;
  let isConnected = false;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await consumer.connect();

      // Subscribe to topics
      await consumer.subscribe({
        topics: [
          "payment.initiated",
          "payment.processed",
          "payment.recorded",
          "payment.failed",
          "payment.completed",
        ],
        // fromBeginning: true only for first-time setup or reprocessing
        fromBeginning: false, // Usually false in production
      });

      isConnected = true;
      logger.info("Payment consumer connected and subscribed");
      break;
    } catch (error) {
      if (attempt === retries - 1) {
        logger.error("Failed to connect consumer after retries", { error });
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 300));
    }
  }

  if (isConnected) {
    await startConsuming();
  }
}

/**
 * SHandler for Consuming Messages
 */
async function startConsuming() {
  await consumer.run({
    autoCommit: false,
    partitionsConsumedConcurrently: 3, // message to process concurrently

    // Process each message
    eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
      const startTime = Date.now();

      try {
        if (!message.value) {
          logger.warn("Empty message received", {
            topic,
            partition,
            offset: message.offset,
          });
          await commitOffset(topic, partition, message.offset);
          return;
        }

        const data = JSON.parse(message.value.toString());
        const headers = message.headers || {};

        logger.info("Processing Kafka message", {
          topic,
          partition,
          offset: message.offset,
          key: message.key?.toString(),
          timestamp: message.timestamp,
          correlationId: headers["correlation-id"]?.toString(),
        });

        // Route to appropriate handler
        const handler = PaymentTopic[topic as keyof typeof PaymentTopic];

        if (!handler) {
          logger.warn("No handler found for topic", { topic });
          await commitOffset(topic, partition, message.offset);
          return;
        }
        await handler(data);
        // COMMITING OFFSET AFTER THE MESSAGE HAS BEEN PROCESSED
        await commitOffset(topic, partition, message.offset);

        // Send heartbeat periodically (especially for long-running tasks)
        await heartbeat();

        const duration = Date.now() - startTime;
        logger.info("Message processed successfully", {
          topic,
          partition,
          offset: message.offset,
          duration,
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error("Error processing message", {
          topic,
          partition,
          offset: message.offset,
          duration,
          error: error.message,
          stack: error.stack,
        });
        // Option 2: ALWAYS commit → message lost if handler fails
        // Better to send to DLQ and move on
        await commitOffset(topic, partition, message.offset);
        await sendToDLQ(topic, partition, message, data, error);

        // Option 3: Pause partition temporarily for backpressure
        const pausePartition = pause();
        setTimeout(() => pausePartition(), 5000); // Resume after 5s
      }
    },
  });
}

/**
 * Commit offset after successful processing
 */
async function commitOffset(topic: string, partition: number, offset: string) {
  try {
    await consumer.commitOffsets([
      {
        topic,
        partition,
        offset: (parseInt(offset) + 1).toString(),
      },
    ]);
  } catch (error: any) {
    logger.error("Failed to commit offset", {
      topic,
      partition,
      offset,
      error,
    });
  }
}

/**
 * Handler for Dead Letter Queue
 */
async function sendToDLQ(
  originalTopic: string,
  partition: number,
  message: any,
  data: any,
  error: Error
) {
  try {
    await sendPaymentMessage(
      "payment.dlq",
      {
        originalTopic,
        partition,
        offset: message.offset,
        timestamp: message.timestamp,
        key: message.key?.toString(),
        data,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        failedAt: new Date().toISOString(),
      },
      message.key?.toString()
    );

    logger.info("Message sent to DLQ", {
      originalTopic,
      offset: message.offset,
    });
  } catch (dlqError: any) {
    logger.error("Failed to send to DLQ", { originalTopic, error: dlqError });
    // Failed Message
  }
}

/**
 * Graceful shutdown
 */
export async function disconnectConsumer() {
  try {
    logger.info("Disconnecting consumer gracefully...");
    await consumer.disconnect();
    logger.info("Payment consumer disconnected");
  } catch (error) {
    logger.error("Error disconnecting consumer", { error });
  }
}

/**
 * Handle signals for graceful shutdown
 */
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down...");
  await disconnectConsumer();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down...");
  await disconnectConsumer();
  process.exit(0);
});
