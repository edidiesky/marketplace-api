import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import logger from "../utils/logger";
import { CartTopic } from "./topics";
import { sendCartMessage } from "./producer";
import { CART_CONSUMER_TOPICS } from "../constants";


const kafka = new Kafka({
  clientId: "Inventory_Service",
  brokers: ["kafka-1:9092", "kafka-2:9093", "kafka-3:9094"],
  retry: { initialRetryTime: 2000, retries: 30, factor: 2 },
});

const consumer: Consumer = kafka.consumer({
  groupId: "Order-group",
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
        topics: CART_CONSUMER_TOPICS,
        fromBeginning: false,
      });
      logger.info("Order consumer connected");
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

      let data: any;
      try {
        if (!message.value) {
          logger.warn("Empty message", {
            topic,
            partition,
            offset: message.offset,
          });
          await commitOffset(topic, partition, message.offset);
          return;
        }
        data = JSON.parse(message.value.toString());
      } catch (parseErr) {
        logger.error("Failed to parse message", {
          topic,
          partition,
          offset: message.offset,
          error: parseErr,
        });
        await sendToDLQ(topic, partition, message, null, parseErr as Error);
        await commitOffset(topic, partition, message.offset);
        return;
      }

      try {
        logger.info("Processing message", {
          topic,
          partition,
          offset: message.offset,
          key: message.key?.toString(),
        });

        const handler = CartTopic[topic as keyof typeof CartTopic];
        if (!handler) {
          logger.warn("No handler for topic", { topic });
          await commitOffset(topic, partition, message.offset);
          return;
        }

        await handler(data);
        await commitOffset(topic, partition, message.offset);
        await heartbeat();

        logger.info("Message processed", {
          topic,
          duration: Date.now() - start,
        });
      } catch (procErr) {
        logger.error("Handler failed", {
          topic,
          partition,
          offset: message.offset,
          error: procErr,
        });
        await sendToDLQ(topic, partition, message, data, procErr as Error);
        await commitOffset(topic, partition, message.offset);
        // // Optional backpressure
        // const p = pause();
        // setTimeout(() => p.resume(), 5000);
      }
    },
  });
}

//  COMMIT OFFSET
async function commitOffset(topic: string, partition: number, offset: string) {
  try {
    await consumer.commitOffsets([
      {
        topic,
        partition,
        offset: (BigInt(offset) + BigInt(1)).toString(),
      },
    ]);
  } catch (err) {
    logger.error("Commit failed", { topic, partition, offset, err });
  }
}

//  DLQ
async function sendToDLQ(
  origTopic: string,
  partition: number,
  msg: any,
  parsedData: any,
  err: Error
) {
  try {
    await sendCartMessage("Order.dlq", {
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
    logger.error("Error in connecting to the Kafka comsumer", {
      message:
        error instanceof Error ? error.message : "unknown error has occurred",
      stack:
        error instanceof Error ? error.stack : "unknown error has occurred",
    });
  }
}
