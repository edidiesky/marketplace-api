import { Kafka, Partitioners, logLevel, CompressionTypes } from "kafkajs";
import logger from "../utils/logger";

const kafka = new Kafka({
  clientId: "Authentication_Service",
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
      logger.info("Authentication producer connected");
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
 * Send Authentication message with proper partitioning
 * Messages with same transactionId/userId will always go to same partition
 * Handler created here guarantees ordering for that customer's transactions
 */
export async function sendAuthenticationMessage(
  topic: string,
  data: any,
  key?: string
) {
  try {
    const partitionKey = 
      key || 
      data.transactionId || 
      data.userId || 
      data.sagaId || 
      data.email || 
      data.notificationId || 
      null; // ← never undefined

    const result = await producer.send({
      topic,
      messages: [
        {
          key: partitionKey ? String(partitionKey) : null,
          value: JSON.stringify(data),
          headers: {
            service: "Authentication-service",
            timestamp: Date.now().toString(),
            "correlation-id": data.sagaId || data.transactionId || data.notificationId || "none",
          },
        },
      ],
      acks: -1,
      timeout: 30000,
    });

    logger.info("Message sent to Kafka", {
      topic,
      key: partitionKey,
      partition: result[0]?.partition,
      offset: result[0]?.offset,
    });

    return result;
  } catch (error: any) {
    logger.error("Error sending message to Kafka", { topic, error: error.message });
    throw error;
  }
}
/**
 * Batch send for high throughput scenarios
 */
export async function sendAuthenticationMessageBatch(
  topic: string,
  messages: Array<{ data: any; key?: string }>
) {
  try {
    const kafkaMessages = messages.map((msg) => ({
      key: msg.key || msg.data.transactionId || msg.data.userId,
      value: JSON.stringify(msg.data),
      headers: {
        service: "Authentication-service",
        timestamp: Date.now().toString(),
      },
    }));

    const result = await producer.send({
      topic,
      messages: kafkaMessages,
      acks: -1,
      compression: CompressionTypes.GZIP,
    });

    logger.info("Batch messages sent to Kafka", {
      topic,
      count: messages.length,
    });

    return result;
  } catch (error: any) {
    logger.error("Error sending batch messages", { topic, error });
    throw error;
  }
}

export async function disconnectProducer() {
  await producer.disconnect();
  logger.info("Authentication producer disconnected");
}
