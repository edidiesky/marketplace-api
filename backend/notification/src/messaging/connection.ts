import amqp from "amqplib";
import logger from "../utils/logger";
import {
  SERVICE_NAME,
  RABBITMQ_URL,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS,
} from "../constants";

const MAX_RETRIES         = 10;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS  = 30_000;

let channel: amqp.Channel | null = null;

const EXCHANGE_LIST = [
  { name: EXCHANGES.NOTIFICATION,     type: "topic"  as const },
  { name: EXCHANGES.NOTIFICATION_DLX, type: "direct" as const },
  { name: EXCHANGES.AUTHENTICATION,   type: "topic"  as const },
  { name: EXCHANGES.ORDERS,           type: "topic"  as const },
  { name: EXCHANGES.PAYMENT,          type: "topic"  as const },
  { name: EXCHANGES.INVENTORY,        type: "topic"  as const },
  { name: EXCHANGES.ORGANIZATION,     type: "topic"  as const },
  { name: EXCHANGES.STORES,           type: "topic"  as const },
];

const QUEUE_TOPOLOGY = [
  {
    queue:      QUEUES.EMAIL_CONFIRMATION,
    exchange:   EXCHANGES.AUTHENTICATION,
    routingKey: ROUTING_KEYS.NOTIFICATION_EMAIL_CONFIRMATION,
  },
  {
    queue:      QUEUES.TWO_FA,
    exchange:   EXCHANGES.AUTHENTICATION,
    routingKey: ROUTING_KEYS.NOTIFICATION_2FA,
  },
  {
    queue:      QUEUES.RESET_PASSWORD,
    exchange:   EXCHANGES.AUTHENTICATION,
    routingKey: ROUTING_KEYS.NOTIFICATION_RESET_PASSWORD,
  },
  {
    queue:      QUEUES.ORG_ONBOARDING,
    exchange:   EXCHANGES.ORGANIZATION,
    routingKey: ROUTING_KEYS.NOTIFICATION_ORG_ONBOARDING,
  },
  {
    queue:      QUEUES.STORE_ONBOARDING,
    exchange:   EXCHANGES.STORES,
    routingKey: ROUTING_KEYS.NOTIFICATION_STORE_ONBOARDING,
  },
  {
    queue:      QUEUES.PAYMENT_SUCCESS,
    exchange:   EXCHANGES.PAYMENT,
    routingKey: ROUTING_KEYS.NOTIFICATION_PAYMENT_SUCCESS,
  },
  {
    queue:      QUEUES.PAYMENT_FAILED,
    exchange:   EXCHANGES.PAYMENT,
    routingKey: ROUTING_KEYS.NOTIFICATION_PAYMENT_FAILED,
  },
  {
    queue:      QUEUES.ORDER_COMPLETED,
    exchange:   EXCHANGES.ORDERS,
    routingKey: ROUTING_KEYS.NOTIFICATION_ORDER_COMPLETED,
  },
  {
    queue:      QUEUES.LOW_STOCK,
    exchange:   EXCHANGES.INVENTORY,
    routingKey: ROUTING_KEYS.NOTIFICATION_LOW_STOCK,
  },
];

const QUEUE_OPTIONS = {
  durable:   true,
  arguments: {
    "x-queue-type":              "quorum",
    "x-delivery-limit":          5,
    "x-dead-letter-exchange":    EXCHANGES.NOTIFICATION_DLX,
    "x-dead-letter-routing-key": "notification.dead",
  },
};

export async function connectRabbitMQ(): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      channel          = await connection.createChannel();

      connection.on("error", (err: Error) => {
        logger.error("rabbitmq_connection_error", {
          event:   "rabbitmq_connection_error",
          service: SERVICE_NAME,
          error:   err.message,
        });
      });

      connection.on("close", () => {
        channel = null;
        logger.warn("rabbitmq_connection_closed", {
          event:   "rabbitmq_connection_closed",
          service: SERVICE_NAME,
        });
      });

      for (const ex of EXCHANGE_LIST) {
        await channel.assertExchange(ex.name, ex.type, { durable: true });
      }

      for (const t of QUEUE_TOPOLOGY) {
        await channel.assertQueue(t.queue, QUEUE_OPTIONS);
        await channel.bindQueue(t.queue, t.exchange, t.routingKey);
        logger.info("rabbitmq_queue_bound", {
          event:      "rabbitmq_queue_bound",
          service:    SERVICE_NAME,
          queue:      t.queue,
          exchange:   t.exchange,
          routingKey: t.routingKey,
        });
      }

      logger.info("rabbitmq_connected", {
        event:   "rabbitmq_connected",
        service: SERVICE_NAME,
        queues:  QUEUE_TOPOLOGY.length,
      });

      return;
    } catch (error) {
      const isLast = attempt === MAX_RETRIES - 1;
      logger.error("rabbitmq_connect_attempt_failed", {
        event:      "rabbitmq_connect_attempt_failed",
        service:    SERVICE_NAME,
        attempt:    attempt + 1,
        isLast,
        error:      error instanceof Error ? error.message : String(error),
      });

      if (isLast) throw error;

      const delay  = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt), MAX_RETRY_DELAY_MS);
      const jitter = Math.random() * 1_000;
      await new Promise((r) => setTimeout(r, delay + jitter));
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
      event:   "rabbitmq_disconnected_gracefully",
      service: SERVICE_NAME,
    });
  } catch (error) {
    logger.error("rabbitmq_disconnect_error", {
      event:   "rabbitmq_disconnect_error",
      service: SERVICE_NAME,
      error:   error instanceof Error ? error.message : String(error),
    });
  }
}