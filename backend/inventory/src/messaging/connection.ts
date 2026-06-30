import amqp from "amqplib";
import logger from "../utils/logger";
import {
  SERVICE_NAME,
  RABBITMQ_URL,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS,
} from "../constants";

const MAX_RETRIES = 10;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

let channel: amqp.Channel | null = null;

const EXCHANGE_LIST = [
  { name: EXCHANGES.INVENTORY, type: "topic" as const },
  { name: EXCHANGES.INVENTORY_DLX, type: "direct" as const },
  { name: EXCHANGES.PRODUCTS, type: "topic" as const },
  { name: EXCHANGES.ORDERS, type: "topic" as const },
  { name: EXCHANGES.NOTIFICATION, type: "topic" as const },
];

const DEFAULT_QUEUE_OPTIONS = {
  durable: true,
  arguments: {
    "x-queue-type": "quorum",
    "x-delivery-limit": 5,
    "x-dead-letter-exchange": EXCHANGES.INVENTORY_DLX,
    "x-dead-letter-routing-key": "inventory.dead",
  },
};

// This MUST match consumer.ts's queueHandlerMap one-to-one. The boot log
// confirmed only 4 of these 5 were ever actually present in the running
// container — ORDER_PAYMENT_CONFIRMED was added in code but never
// deployed, which is the entire reason the saga stalled after
// "order_payment_confirmed_event_published" with nothing downstream
// ever firing.
const QUEUE_TOPOLOGY = [
  {
    queue: QUEUES.PRODUCT_CREATED,
    exchange: EXCHANGES.PRODUCTS,
    routingKey: ROUTING_KEYS.PRODUCT_CREATED,
    options: DEFAULT_QUEUE_OPTIONS,
  },
  {
    queue: QUEUES.ORDER_COMPLETED,
    exchange: EXCHANGES.ORDERS,
    routingKey: ROUTING_KEYS.ORDER_COMPLETED,
    options: DEFAULT_QUEUE_OPTIONS,
  },
  {
    queue: QUEUES.ORDER_FAILED,
    exchange: EXCHANGES.ORDERS,
    routingKey: ROUTING_KEYS.ORDER_FAILED,
    options: DEFAULT_QUEUE_OPTIONS,
  },
  {
    queue: QUEUES.ORDER_ABANDONED,
    exchange: EXCHANGES.ORDERS,
    routingKey: ROUTING_KEYS.ORDER_ABANDONED,
    options: DEFAULT_QUEUE_OPTIONS,
  },
  {
    queue: QUEUES.ORDER_PAYMENT_CONFIRMED,
    exchange: EXCHANGES.ORDERS,
    routingKey: ROUTING_KEYS.ORDER_PAYMENT_CONFIRMED,
    options: DEFAULT_QUEUE_OPTIONS,
  },
];

export async function connectRabbitMQ(): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      connection.on("error", (err: Error) => {
        logger.error("rabbitmq_connection_error", {
          event: "rabbitmq_connection_error",
          service: SERVICE_NAME,
          error: err.message,
        });
      });

      connection.on("close", () => {
        channel = null;
        logger.warn("rabbitmq_connection_closed", {
          event: "rabbitmq_connection_closed",
          service: SERVICE_NAME,
        });
      });

      for (const ex of EXCHANGE_LIST) {
        await channel.assertExchange(ex.name, ex.type, { durable: true });
      }

      for (const t of QUEUE_TOPOLOGY) {
        await channel.assertQueue(t.queue, t.options);
        await channel.bindQueue(t.queue, t.exchange, t.routingKey);
        logger.info("rabbitmq_queue_bound", {
          event: "rabbitmq_queue_bound",
          service: SERVICE_NAME,
          queue: t.queue,
          exchange: t.exchange,
          routingKey: t.routingKey,
        });
      }

      logger.info("rabbitmq_connected", {
        event: "rabbitmq_connected",
        service: SERVICE_NAME,
        exchanges: EXCHANGE_LIST.map((e) => e.name),
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
        MAX_RETRY_DELAY_MS,
      );
      const jitter = Math.random() * 1_000;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }
}

export function getRabbitMQChannel(): amqp.Channel {
  if (!channel) {
    throw new Error(
      "RabbitMQ channel not ready. Call connectRabbitMQ() first.",
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