import amqp from "amqplib";
import logger from "../utils/logger";
import { userTopics } from "./topics";
import {
  QUEUES,
  USER_EXCHANGE,
  BULK_TAXPAYER_TOPIC,
  BULK_CORPORATE_TAXPAYER_TOPIC,
  NIN_VERIFICATION_TOPIC,
  BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC,
  BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC,
  BULK_COMPANY_BRANCH_UPLOAD_TOPIC,
  BULK_COMPANY_UPLOAD_TOPIC,
} from "../constants";
import {
  startBulkCorporateTaxpayerCreationWorker,
  startBulkTaxpayerCreationWorker,
} from "../workers/BulkTaxPayerCreationWorker";
import { BulkIndividualTaxpayerWorker } from "../workers/BulkIndividualTaxpayerWorker";
import { BulkExpartiateTaxpayerWorker } from "../workers/BulkExpartiateTaxpayerWorker";
import { BulkCompanyCreationWorker } from "../workers/BulkCompanyCreationWorker";
import { BulkCompanyBranchCreationWorker } from "../workers/BulkCompanyBranchCreationWorker";

interface TopicHandlers {
  [key: string]: (data: unknown) => Promise<void>;
}

const topicHandlers: TopicHandlers = userTopics;
let channel: amqp.Channel | null = null;

export async function connectConsumer() {
  let retries = 10;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL!);
      channel = await connection.createChannel();
      // Assert exchange
      await channel.assertExchange(USER_EXCHANGE, "topic", { durable: true });
      for (const [topic, queue] of Object.entries(QUEUES)) {
        await channel.assertQueue(queue, { durable: true });
        await channel.bindQueue(queue, USER_EXCHANGE, topic);
        logger.info(
          `Bound queue, ${queue} to RabbitMQ exchange ${[
            USER_EXCHANGE,
          ]} using the routing key ${topic}`
        );
      }
      logger.info("RabbitMQ Consumer connected");

      // Start consuming messages
      for (const [topic, queue] of Object.entries(QUEUES)) {
        logger.info(`Consuming queue ${queue} for topic ${topic}`);
        if (
          topic === BULK_TAXPAYER_TOPIC ||
          topic === BULK_CORPORATE_TAXPAYER_TOPIC ||
          topic === BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC ||
          topic === BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC ||
          topic === BULK_COMPANY_BRANCH_UPLOAD_TOPIC ||
          topic === BULK_COMPANY_UPLOAD_TOPIC ||
          topic === NIN_VERIFICATION_TOPIC //BULK_COMPANY_BRANCH_UPLOAD_TOPIC
        )
          continue;
        channel.consume(
          queue,
          async (msg) => {
            if (!msg) {
              logger.warn(`No message received for queue ${queue}`);
              return;
            }
            try {
              logger.info(`Message received on queue ${queue}`, {
                content: msg.content.toString(),
                routingKey: msg.fields.routingKey,
              });
              const data = JSON.parse(msg.content.toString());
              const handler =
                topicHandlers[topic as keyof typeof topicHandlers];
              if (handler) {
                await handler(data);
              } else {
                logger.warn("No handler found for topic", { topic });
              }
              channel!.ack(msg);
            } catch (error) {
              logger.error("Error processing message", { error });
              channel!.nack(msg, false, true);
            }
          },
          { noAck: false }
        );
      }

      // Start workers BULK_COMPANY_UPLOAD_TOPIC
      await startBulkTaxpayerCreationWorker(channel);
      await startBulkCorporateTaxpayerCreationWorker(channel);
      await BulkExpartiateTaxpayerWorker(channel);
      await BulkIndividualTaxpayerWorker(channel)
      await BulkCompanyBranchCreationWorker(channel)
      await BulkCompanyCreationWorker(channel)

      break;
    } catch (error) {
      logger.error("Failed to connect RabbitMQ Consumer", { error, attempt });
      if (attempt === retries - 1) throw error;
      const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
      const jitter = Math.random() * 1000;
      logger.error("RabbitMQ delays:", { delay });
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }
}

export async function disconnectConsumer() {
  if (channel) {
    await channel.close();
    logger.info("RabbitMQ Consumer disconnected");
  }
}
