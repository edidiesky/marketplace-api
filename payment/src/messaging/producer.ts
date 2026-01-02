import { Kafka, Partitioners, logLevel, CompressionTypes } from "kafkajs";
import logger from "../utils/logger";

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
      logger.info("Payment producer connected");
      return;
    } catch (error) {
      if (attempt === retries - 1) {
        logger.error("Failed to connect producer", {
          event: "kafka_producer_conenction_failed",
          message:
            error instanceof Error
              ? error.message
              : "An unknown error has occurred",
          stack:
            error instanceof Error
              ? error.stack
              : "An unknown error has occurred",
        });
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 300));
    }
  }
}

/**
 * Send Payment message with proper partitioning
 * I am paritioning by the PaymentId
 * Handler created here guarantees Paymenting for that customer's transactions
 */
export async function sendPaymentMessage(topic: string, data: any, key?: string) {
  try {
    const partitionKey =
      key || data.transactionId || null;
    const result = await producer.send({
      topic,
      messages: [
        {
          key: partitionKey,
          value: JSON.stringify(data),
          headers: {
            service: "Payment-service",
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
    logger.error("Error sending message to Kafka", {
      topic,
      event: "kafka_producer_message_failed",
      message:
        error instanceof Error
          ? error.message
          : "An unknown error has occurred",
      stack:
        error instanceof Error ? error.stack : "An unknown error has occurred",
    });
    throw error;
  }
}

/**
 * Batch send for high throughput scenarios
 */
export async function sendPaymentMessageBatch(
  topic: string,
  messages: Array<{ data: any; key?: string }>
) {
  try {
    const kafkaMessages = messages.map((msg) => ({
      key: msg.key || msg.data.transactionId || msg.data.userId,
      value: JSON.stringify(msg.data),
      headers: {
        service: "Payment-service",
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
  logger.info("Payment producer disconnected");
}
