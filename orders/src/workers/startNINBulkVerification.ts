import logger from "../utils/logger";
import {
  NIN_VERIFICATION_TOPIC,
  QUEUES,
  USER_EXCHANGE,
  NIN_VERIFICATION_RESULT_TOPIC,
} from "../constants";
import amqp from "amqplib";
import { NINVerificationResult, verifyNIN } from "../utils/verifyNIN";
import Bottleneck from "bottleneck";
import { sendUserMessage } from "../messaging/producer";
import { IUser } from "../models/User";

export const startNINVerificationWorker = async (
  rabbitChannel: amqp.Channel
) => {
  let channel = rabbitChannel;

  try {
    await channel.assertQueue(QUEUES[NIN_VERIFICATION_TOPIC], {
      durable: true,
    });
    await channel.bindQueue(
      QUEUES[NIN_VERIFICATION_TOPIC],
      USER_EXCHANGE,
      NIN_VERIFICATION_TOPIC
    );

    logger.info(
      `Consuming queue ${QUEUES[NIN_VERIFICATION_TOPIC]} for topic ${NIN_VERIFICATION_TOPIC}`
    );
    channel.consume(
      QUEUES[NIN_VERIFICATION_TOPIC],
      async (msg) => {
        if (!msg) return;
        try {
          const messageData = JSON.parse(msg.content.toString());
          const { publicId, nins, taxpayerRecords } = messageData;
          logger.info("Received NIN verification message", {
            publicId,
            ninCount: nins.length,
          });

          const results: NINVerificationResult[] = [];
          const limiter = new Bottleneck({ maxConcurrent: 10, minTime: 100 });
          const verifyNINLimited = limiter.wrap(verifyNIN);

          const verificationPromises = nins.map(
            ({
              nin,
              firstname,
              lastname,
              rowCount,
            }: {
              nin: string;
              firstname: string;
              lastname: string;
              rowCount: number;
            }) => verifyNINLimited(nin, firstname, lastname, rowCount)
          );
          const verificationResults = await Promise.allSettled(
            verificationPromises
          );

          verificationResults.forEach((result: any, index) => {
            logger.info("Verification result:", result);
            const user = taxpayerRecords.find(
              (taxpayer: Partial<IUser>) => taxpayer.nin === nins[index].nin
            );
            // logger.info("user data:", { user, result, taxpayerRecords });
            if (result.status === "fulfilled") {
              if (user) {
                results.push({
                  ...user, // Include full taxpayer record
                  isValid: result.value.isValid,
                  profileImage: result.value.photoUrl || user.photoUrl || "",
                  firstName: result.value.firstName || user.firstName,
                  lastName: result.value.lastName || user.lastName,
                  middleName: result.value.middleName || user.middleName,
                  lga: user.lga,
                  address: user.address,
                });
              } else {
                results.push({
                  nin: nins[index].nin,
                  isValid: false,
                  rowCount: result.rowCount,
                  error: "Taxpayer record not found",
                });
              }
            } else {
              results.push({
                nin: nins[index].nin,
                isValid: false,
                error: result.reason?.message || "Verification failed",
                rowCount: result.rowCount,
              });
            }
          });

          // Publish results instead of storing in Redis
          await sendUserMessage(NIN_VERIFICATION_RESULT_TOPIC, {
            publicId,
            results,
            taxpayerRecords,
          });
          channel.ack(msg);
        } catch (error: any) {
          logger.error("Error processing NIN verification message", {
            error: error.message,
          });
          channel.nack(msg, false, true);
        }
      },
      { noAck: false }
    );
  } catch (error) {
    logger.error("Failed to start NIN verification worker", { error });
    throw error;
  }
};
