
import amqp from "amqplib";
import logger from "../utils/logger";
import { QUEUES, REPORTING_EXCHANGE } from "../constants";

let channel: amqp.Channel | null = null;
const NOTIFICATION_EXCHANGE = "notification_exchange";
const USER_EXCHANGE = "auth_exchange";

export async function connectProducer() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);
    channel = await connection.createChannel();

    // Assert the topic exchange

    await channel.assertExchange(NOTIFICATION_EXCHANGE, "topic", { durable: true });
    await channel.assertExchange(USER_EXCHANGE, "topic", { durable: true });
    await channel.assertExchange(REPORTING_EXCHANGE, "topic", {
      durable: true,
    });

    logger.info("User RabbitMQ Producer connected");
  } catch (error) {
    logger.error("Failed to connect RabbitMQ Producer", { error });
    throw error;
  }
}

export async function sendUserMessage(topic: string, message: any) {
  if (!channel) {
    await connectProducer();
  }
  try {
    const exchange = topic.startsWith("reporting.")
      ? REPORTING_EXCHANGE
      : topic.startsWith("notification.")
      ? NOTIFICATION_EXCHANGE
      : USER_EXCHANGE;
    channel!.publish(exchange, topic, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
    logger.info(`Sent message to ${topic} on exchange ${exchange}`, {
      message,
    });
  } catch (error) {
    logger.error(`Error sending message to ${topic}`, { error, message });
    throw error;
  }
}

export async function disconnectUserProducer() {
  try {
    if (channel) {
      await channel.close();
      logger.info("RabbitMQ Producer disconnected");
    }
  } catch (error) {
    logger.error("Error disconnecting RabbitMQ Producer", { error });
  }
}
