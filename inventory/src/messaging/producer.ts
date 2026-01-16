import { Kafka, Partitioners, logLevel, CompressionTypes } from "kafkajs";
import logger from "../utils/logger";

const kafka = new Kafka({
  clientId: "Tenant_Service",
  brokers: ["kafka-1:9092", "kafka-2:9093", "kafka-3:9094"],
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 2000,
    retries: 30,
    factor: 2,
  },
});

// Producer
const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
  allowAutoTopicCreation: false,
  transactionTimeout: 30000,
  idempotent: true,
  maxInFlightRequests: 5,
});

export async function connectProducer() {
  const retries = 10;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await producer.connect();
      logger.info("Inventory producer connected");
      return;
    } catch (error) {
      if (attempt === retries - 1) {
        logger.error("Failed to connect producer", { error });
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 300));
    }
  }
}

/**
 * Send Inventory message with proper partitioning
 * Handler created here guarantees ordering for that customer's transactions
 */
export async function sendInventoryMessage(
  topic: string,
  data: any,
  key?: string
) {
  try {
    const partitionKey =
      key || data.transactionId || data.userId || data.ownerEmail || null;
    const result = await producer.send({
      topic,
      messages: [
        {
          key: partitionKey,
          value: JSON.stringify(data),
          headers: {
            service: "Inventory-service",
            timestamp: Date.now().toString(),
            "correlation-id": data.sagaId || data.transactionId || "null",
          },
        },
      ],
      acks: -1,
      timeout: 30000,
    });

    logger.info("Message sent to Kafka", {
      topic,
      partition: result[0].partition,
      offset: result[0].offset,
      key: partitionKey,
    });

    return result;
  } catch (error: any) {
    logger.error("Error sending message to Kafka", { topic, error });
    throw error;
  }
}


export async function disconnectProducer() {
  await producer.disconnect();
  logger.info("Inventory producer disconnected");
}
