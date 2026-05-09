import amqp from "amqplib";
import { QUEUE_TOPOLOGY, DEPLOYMENTS_EXCHANGE, DEPLOYMENTS_DLX } from "./topics";
import { createLogger } from "../../shared/utils/logger";
import { SERVICE_NAME, RABBITMQ_URL } from "../../shared/constants";

const logger = createLogger(SERVICE_NAME);

const MAX_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

let channel: amqp.Channel | null = null;

export async function connectRabbitMQ(): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      connection.on("error", (error: Error) => {
        logger.error("rabbitmq_connection_error", {
          event: "rabbitmq_connection_error",
          service: SERVICE_NAME,
          error: error.message,
        });
      });

      connection.on("close", () => {
        channel = null;
        logger.warn("rabbitmq_connection_closed", {
          event: "rabbitmq_connection_closed",
          service: SERVICE_NAME,
        });
      });

      await channel.assertExchange(DEPLOYMENTS_EXCHANGE, "topic", {
        durable: true,
      });

      await channel.assertExchange(DEPLOYMENTS_DLX, "topic", {
        durable: true,
      });

      for (const topology of QUEUE_TOPOLOGY) {
        await channel.assertQueue(topology.queue, topology.options);
        await channel.bindQueue(
          topology.queue,
          topology.exchange,
          topology.routingKey
        );

        logger.info("rabbitmq_queue_bound", {
          event: "rabbitmq_queue_bound",
          service: SERVICE_NAME,
          queue: topology.queue,
          exchange: topology.exchange,
          routingKey: topology.routingKey,
        });
      }

      logger.info("rabbitmq_connected", {
        event: "rabbitmq_connected",
        service: SERVICE_NAME,
        exchange: DEPLOYMENTS_EXCHANGE,
        queues: QUEUE_TOPOLOGY.map((t) => t.queue),
      });

      return;
    } catch (error) {
      const isLast = attempt === MAX_RETRIES - 1;

      logger.error("rabbitmq_connect_attempt_failed", {
        event: "rabbitmq_connect_attempt_failed",
        service: SERVICE_NAME,
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES,
        isLast,
        error: error instanceof Error ? error.message : String(error),
      });

      if (isLast) throw error;

      const delay = Math.min(
        BASE_RETRY_DELAY_MS * Math.pow(2, attempt),
        MAX_RETRY_DELAY_MS
      );
      const jitter = Math.random() * 1_000;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }
}

export function getRabbitMQChannel(): amqp.Channel {
  if (!channel) {
    throw new Error(
      "RabbitMQ channel not ready. Call connectRabbitMQ() first."
    );
  }
  return channel;
}

export async function disconnectRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }

    logger.info("rabbitmq_disconnected_gracefully", {
      event: "rabbitmq_disconnected_gracefully",
      service: SERVICE_NAME,
    });
  } catch (error) {
    logger.error("rabbitmq_disconnect_error", {
      event: "rabbitmq_disconnect_error",
      service: SERVICE_NAME,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}