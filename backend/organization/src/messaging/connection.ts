import amqp from "amqplib";
import {
  SERVICE_NAME,
  RABBITMQ_URL,
  EXCHANGES,
  QUEUES,
  ROUTING_KEYS,
} from "../constant";

const MAX_RETRIES         = 10;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS  = 30_000;

let channel: amqp.Channel | null = null;

const EXCHANGE_LIST = [
  { name: EXCHANGES.ORGANIZATION,     type: "topic"  as const },
  { name: EXCHANGES.ORGANIZATION_DLX, type: "direct" as const },
];

const QUEUE_TOPOLOGY = [
  {
    queue:      QUEUES.USER_ONBOARDING,
    exchange:   EXCHANGES.AUTHENTICATION,
    routingKey: ROUTING_KEYS.USER_ONBOARDING_COMPLETED,
    options: {
      durable:   true,
      arguments: {
        "x-queue-type":              "quorum",
        "x-delivery-limit":          5,
        "x-dead-letter-exchange":    EXCHANGES.ORGANIZATION_DLX,
        "x-dead-letter-routing-key": "organization.dead",
      },
    },
  },
];

export async function connectRabbitMQ(): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      channel          = await connection.createChannel();

      connection.on("error", (err: Error) => {
        console.error(JSON.stringify({
          event:   "rabbitmq_connection_error",
          service: SERVICE_NAME,
          error:   err.message,
        }));
      });

      connection.on("close", () => {
        channel = null;
        console.warn(JSON.stringify({
          event:   "rabbitmq_connection_closed",
          service: SERVICE_NAME,
        }));
      });

      for (const ex of EXCHANGE_LIST) {
        await channel.assertExchange(ex.name, ex.type, { durable: true });
      }

      for (const t of QUEUE_TOPOLOGY) {
        await channel.assertQueue(t.queue, t.options);
        await channel.bindQueue(t.queue, t.exchange, t.routingKey);
        console.info(JSON.stringify({
          event:      "rabbitmq_queue_bound",
          service:    SERVICE_NAME,
          queue:      t.queue,
          exchange:   t.exchange,
          routingKey: t.routingKey,
        }));
      }

      console.info(JSON.stringify({
        event:    "rabbitmq_connected",
        service:  SERVICE_NAME,
        exchanges: EXCHANGE_LIST.map((e) => e.name),
        queues:   QUEUE_TOPOLOGY.map((t) => t.queue),
      }));

      return;
    } catch (error) {
      const isLast = attempt === MAX_RETRIES - 1;
      console.error(JSON.stringify({
        event:      "rabbitmq_connect_attempt_failed",
        service:    SERVICE_NAME,
        attempt:    attempt + 1,
        maxRetries: MAX_RETRIES,
        isLast,
        error:      error instanceof Error ? error.message : String(error),
      }));

      if (isLast) throw error;

      const delay =
        Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt), MAX_RETRY_DELAY_MS);
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
    console.info(JSON.stringify({
      event:   "rabbitmq_disconnected_gracefully",
      service: SERVICE_NAME,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      event:   "rabbitmq_disconnect_error",
      service: SERVICE_NAME,
      error:   error instanceof Error ? error.message : String(error),
    }));
  }
}