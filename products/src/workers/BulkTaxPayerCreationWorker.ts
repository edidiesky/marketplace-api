import {
  BULK_CORPORATE_TAXPAYER_TOPIC,
  BULK_TAXPAYER_EMAIL_TOPIC,
  BULK_TAXPAYER_RESULT_TOPIC,
  BULK_TAXPAYER_SMS_TOPIC,
  BULK_TAXPAYER_TOPIC,
  CHUNK_SIZE,
  QUEUES,
  USER_EXCHANGE,
} from "../constants";
import { v4 as uuidv4 } from "uuid";

import { sendUserMessage } from "../messaging/producer";
import User, { IUser, UserType } from "../models/User";
import logger from "../utils/logger";
import { normalizePhoneNumber } from "../utils/normalizePhoneNumber";
import amqp from "amqplib";

let channel: amqp.Channel | null = null;

import redisClient from "../config/redis";
import {
  LOGIN_2FA_TOPIC,
  USER_NOTIFICATION_SUCCESS,
  USER_CREATION_COMPLETED_TOPIC,
  USER_CREATION_FAILED_TOPIC,
} from "../constants";
import { getSingleTINFromPool } from "../utils/generateTIN";
import mongoose from "mongoose";

const BATCH_SIZE = 1000;
const redisKey = "user.created.batch";

const processUserCreationQueue = async (retries: number = 4) => {
  const batch: IUser[] = [];
  while (batch.length < BATCH_SIZE) {
    const userData = await redisClient.rpop(redisKey);
    if (!userData) break;
    try {
      const user: IUser = JSON.parse(userData);
      batch.push(user);
    } catch (error) {
      logger.error("Error parsing user data from Redis", { error, userData });
    }
  }

  if (batch.length === 0) return;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
        await User.insertMany(batch.slice(i, i + CHUNK_SIZE), {
          ordered: false,
        });
        logger.info(`Inserted ${batch.length} users into MongoDB`);
        // Publish completion event for each user
        for (const user of batch.slice(i, i + CHUNK_SIZE)) {
          await sendUserMessage(USER_CREATION_COMPLETED_TOPIC, {
            requestId: user.requestId,
            tin: user.tin,
            email: user.email,
          });
        }
      }
      break;
    } catch (error: any) {
      if (attempt === retries - 1) {
        logger.error("Failed to insert user batch", {
          error: error.message,
          batchSize: batch.length,
        });
        for (const user of batch) {
          await redisClient.lpush(redisKey, JSON.stringify(user));
          await sendUserMessage(USER_CREATION_FAILED_TOPIC, {
            requestId: user.requestId,
            tin: user.tin,
            email: user.email,
            error: error.message,
          });
        }
        throw error;
      }
      const delay = Math.min(30000, Math.pow(2, attempt));
      const jitter = Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }
};

export const startUserCreationWorker = () => {
  const processLoop = async () => {
    while (true) {
      try {
        await processUserCreationQueue();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error("Error in user creation worker", { error });
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  };

  processLoop().catch((error) => {
    logger.error("User creation worker crashed", { error });
    setTimeout(processLoop, 5000); // Restart on crash
  });
};


export const startBulkTaxpayerCreationWorker = async (
  rabbitChannel: amqp.Channel
) => {
  let channel = rabbitChannel;

  try {
    await channel.assertQueue(QUEUES[BULK_TAXPAYER_TOPIC], { durable: true });
    await channel.bindQueue(
      QUEUES[BULK_TAXPAYER_TOPIC],
      USER_EXCHANGE,
      BULK_TAXPAYER_TOPIC
    );

    logger.info(
      `Consuming queue ${QUEUES[BULK_TAXPAYER_TOPIC]} for topic ${BULK_TAXPAYER_TOPIC}`
    );

    channel.consume(
      QUEUES[BULK_TAXPAYER_TOPIC],
      async (msg) => {
        if (!msg) return;

        try {
          const messageData = JSON.parse(msg.content.toString());
          const { publicId, employerTin, taxpayers } = messageData;

          logger.info("Received bulk taxpayer creation message", {
            publicId,
            employerTin,
            taxpayerCount: taxpayers.length,
          });

          if (taxpayers.length === 0) {
            logger.info("Empty batch received, skipping...");
            channel.ack(msg);
            return;
          }

          // Normalize taxpayer data
          for (const taxpayer of taxpayers) {
            taxpayer.gender = taxpayer.gender?.toUpperCase();
            taxpayer.maritalStatus = taxpayer.maritalStatus?.toUpperCase();
            taxpayer.dateOfBirth = taxpayer.dateOfBirth;
          }

          // Check for existing users
          const tins = taxpayers.map((taxpayer: any) => taxpayer.tin);
          const emails = taxpayers.map((taxpayer: any) => taxpayer.email);

          const existingUsers = await User.find({
            $or: [{ tin: { $in: tins } }, { email: { $in: emails } }],
          }).select("tin email");

          const existingTins = new Set(existingUsers.map((user) => user.tin));
          const existingEmails = new Set(
            existingUsers.map((user) => user.email)
          );

          let filteredBatch = taxpayers.filter(
            (t: any) => !existingTins.has(t.tin) && !existingEmails.has(t.email)
          );

          const excludedRecords = taxpayers.filter(
            (t: any) => existingTins.has(t.tin) || existingEmails.has(t.email)
          );

          if (excludedRecords.length > 0) {
            logger.warn("Excluded duplicate records", {
              excludedRecords: excludedRecords.map(
                (r: { tin: any; email: any }) => ({
                  tin: r.tin,
                  email: r.email,
                })
              ),
            });
          }

          if (filteredBatch.length === 0) {
            await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
              publicId,
              status: "error",
              message: "All records are duplicates",
              excludedRecords: excludedRecords.map(
                (r: { tin: any; email: any }) => ({
                  tin: r.tin,
                  email: r.email,
                })
              ),
            });
            channel.ack(msg);
            return;
          }

          let insertedTaxpayers: any[] = [];
          let failedTins: Set<string> = new Set();
          let insertionSuccess = false;

          // Try insertion with multiple approaches
          for (let attempt = 0; attempt < 4 && !insertionSuccess; attempt++) {
            try {
              logger.info(`Insertion attempt ${attempt + 1}`, {
                batchSize: filteredBatch.length,
                publicId,
              });
              logger.info("Trying insertion without transaction", {
                attempt: attempt + 1,
              });

              for (let i = 0; i < filteredBatch.length; i += CHUNK_SIZE) {
                const chunk = filteredBatch
                  .slice(i, i + CHUNK_SIZE)
                  .filter((t: { tin: string }) => !failedTins.has(t.tin));

                if (chunk.length === 0) continue;

                try {
                  const result = await User.insertMany(chunk, {
                    ordered: false,
                  });

                  insertedTaxpayers.push(...result);

                  logger.info(
                    "Successfully inserted chunk without transaction",
                    {
                      chunkIndex: Math.floor(i / CHUNK_SIZE) + 1,
                      insertedCount: result.length,
                      expectedCount: chunk.length,
                    }
                  );
                } catch (chunkError: any) {
                  logger.warn("Chunk insertion failed", {
                    chunkIndex: Math.floor(i / CHUNK_SIZE) + 1,
                    error: chunkError.message,
                    code: chunkError.code,
                  });

                  // Handle duplicate errors at chunk level
                  if (chunkError.code === 11000 || chunkError.writeErrors) {
                    const successfulInserts = chunkError.insertedDocs || [];
                    insertedTaxpayers.push(...successfulInserts);

                    const failedRecords = chunkError.writeErrors
                      ? chunkError.writeErrors.map((e: any) => e.op)
                      : chunk;
                    failedRecords.forEach((r: any) => failedTins.add(r.tin));
                  }
                }
              }

              insertionSuccess = true;
              logger.info("Non-transaction approach completed", {
                attempt: attempt + 1,
                insertedCount: insertedTaxpayers.length,
                failedCount: failedTins.size,
              });
              // Update filtered batch for next attempt if needed
              filteredBatch = filteredBatch.filter(
                (t: { tin: string }) => !failedTins.has(t.tin)
              );
            } catch (attemptError: any) {
              logger.error(`Insertion attempt ${attempt + 1} failed`, {
                error: attemptError.message,
                stack: attemptError.stack,
              });

              // Wait before retry
              if (attempt < 3) {
                const delay = 1000 * (attempt + 1); // Progressive delay
                logger.info(`Waiting ${delay}ms before retry`);
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            } finally {
              // await session.endSession();
            }
          }

          // Process notifications for successfully inserted taxpayers
          if (insertedTaxpayers.length > 0) {
            logger.info("Processing notifications for inserted taxpayers", {
              count: insertedTaxpayers.length,
            });

            for (const insertedTaxpayer of insertedTaxpayers) {
              // Find original taxpayer data with plaintext password
              const originalTaxpayer = taxpayers.find(
                (t: any) => t.tin === insertedTaxpayer.tin
              );

              if (!originalTaxpayer) {
                logger.warn("Could not find original taxpayer data", {
                  tin: insertedTaxpayer.tin,
                });
                continue;
              }

              const fullName =
                `${originalTaxpayer.firstName} ${originalTaxpayer.lastName}`.trim();

              // Queue email notification
              try {
                const emailData = {
                  email: originalTaxpayer.email,
                  name: fullName,
                  accountType: "individual",
                  tin: originalTaxpayer.tin,
                  password: originalTaxpayer.plaintextPassword,
                  profileLink: `${
                    process.env.WEB_ORIGIN ||
                    process.env.WEB_ORIGIN2 ||
                    process.env.WEB_ORIGIN3
                  }/auth/signin`,
                  unsubscribeLink: `${
                    process.env.WEB_ORIGIN ||
                    process.env.WEB_ORIGIN2 ||
                    process.env.WEB_ORIGIN3
                  }/auth/signin`,
                  notificationId: uuidv4(),
                };
                await sendUserMessage(BULK_TAXPAYER_EMAIL_TOPIC, emailData);
                logger.info("Queued email notification", {
                  email: originalTaxpayer.email,
                  tin: originalTaxpayer.tin,
                });
              } catch (emailError) {
                logger.error("Failed to queue email notification", {
                  tin: originalTaxpayer.tin,
                  error: emailError,
                });
              }

              // Queue SMS notification
              try {
                const smsData = {
                  phone: originalTaxpayer.phone,
                  message: `Hi ${fullName}, Welcome to AKIRS! Your credentials: Taxpayer ID: ${
                    originalTaxpayer.tin
                  }, Password: ${originalTaxpayer.plaintextPassword}. Visit ${
                    process.env.WEB_ORIGIN ||
                    process.env.WEB_ORIGIN2 ||
                    process.env.WEB_ORIGIN3
                  }/auth/signin to get started.`,
                };
                await sendUserMessage(BULK_TAXPAYER_SMS_TOPIC, smsData);
                logger.info("Queued SMS notification", {
                  phone: originalTaxpayer.phone,
                  tin: originalTaxpayer.tin,
                });
              } catch (smsError) {
                logger.error("Failed to queue SMS notification", {
                  tin: originalTaxpayer.tin,
                  error: smsError,
                });
              }
            }
          }

          // Send final result
          const allExcludedRecords = [
            ...excludedRecords,
            ...Array.from(failedTins).map((tin) => {
              const taxpayer = taxpayers.find((t: any) => t.tin === tin);
              return { tin, email: taxpayer?.email };
            }),
          ].filter((r) => r.tin && r.email);

          await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
            publicId,
            status: insertedTaxpayers.length > 0 ? "success" : "error",
            message:
              insertedTaxpayers.length > 0
                ? `Successfully processed ${insertedTaxpayers.length} taxpayer records`
                : "Failed to insert any taxpayer records",
            insertedCount: insertedTaxpayers.length,
            excludedRecords: allExcludedRecords,
          });

          logger.info("Bulk taxpayer creation completed", {
            publicId,
            totalProcessed: taxpayers.length,
            inserted: insertedTaxpayers.length,
            excluded: allExcludedRecords.length,
            failed: failedTins.size,
          });

          channel.ack(msg);
        } catch (error: any) {
          logger.error("Error processing bulk taxpayer creation message", {
            error: error.message,
            stack: error.stack,
          });

          await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
            publicId: JSON.parse(msg.content.toString()).publicId,
            status: "error",
            message: error?.message || "Unknown error occurred",
            insertedCount: 0,
            excludedRecords: [],
          });

          channel.nack(msg, false, false); // Don't requeue on critical errors
        } finally {
          // Ensure session is always cleaned up
          // await session.endSession();
        }
      },
      { noAck: false }
    );
  } catch (error) {
    logger.error("Failed to start bulk taxpayer creation worker", { error });
    throw error;
  }
};

export const startBulkCorporateTaxpayerCreationWorker = async (
  rabbitChannel: amqp.Channel
) => {
  channel = rabbitChannel;

  try {
    await channel.assertQueue(QUEUES[BULK_CORPORATE_TAXPAYER_TOPIC], {
      durable: true,
    });
    await channel.bindQueue(
      QUEUES[BULK_CORPORATE_TAXPAYER_TOPIC],
      USER_EXCHANGE,
      BULK_CORPORATE_TAXPAYER_TOPIC
    );

    logger.info(
      `Consuming queue ${QUEUES[BULK_CORPORATE_TAXPAYER_TOPIC]} for topic ${BULK_CORPORATE_TAXPAYER_TOPIC}`
    );
    channel.consume(
      QUEUES[BULK_CORPORATE_TAXPAYER_TOPIC],
      async (msg) => {
        if (!msg) return;
        try {
          const messageData = JSON.parse(msg.content.toString());
          const { publicId, employerTin, taxpayers } = messageData;
          logger.info("Received bulk corporate taxpayer creation message", {
            publicId,
            employerTin,
            taxpayerCount: taxpayers.length,
          });

          if (taxpayers.length === 0) {
            logger.info("Empty batch received, skipping...");
            channel!.ack(msg);
            return;
          }
          

          // Normalize taxpayer details
          for (const taxpayer of taxpayers) {
            taxpayer.companyName = taxpayer.companyName?.toUpperCase();
            taxpayer.companyType = taxpayer.companyType?.toUpperCase();
            taxpayer.proofOfResidency =
              taxpayer.proofOfResidency?.toUpperCase();
            taxpayer.registrationDate = taxpayer.registrationDate
              ? new Date(taxpayer.registrationDate).toISOString().split("T")[0]
              : undefined;
          }

          // Check for duplicates
          const cacNumbers = taxpayers.map(
            (taxpayer: any) => taxpayer.cacNumber
          );
          const companyEmails = taxpayers.map(
            (taxpayer: any) => taxpayer.companyEmail
          );
          const existingCompanies = await User.find({
            $or: [
              { cacNumber: { $in: cacNumbers } },
              { companyEmail: { $in: companyEmails } },
            ],
            userType: UserType.COMPANY,
          }).select("cacNumber companyEmail");
          logger.debug("Existing companies found", {
            existingCompanies: existingCompanies.map((c) => ({
              cacNumber: c.cacNumber,
              companyEmail: c.companyEmail,
            })),
          });
          const existingCacNumbers = new Set(
            existingCompanies.map((c) => c.cacNumber)
          );
          const existingEmails = new Set(
            existingCompanies.map((c) => c.companyEmail)
          );

          const filteredBatch = taxpayers.filter(
            (t: any) =>
              !existingCacNumbers.has(t.cacNumber) &&
              !existingEmails.has(t.companyEmail)
          );
          const excludedRecords = taxpayers.filter(
            (t: any) =>
              existingCacNumbers.has(t.cacNumber) ||
              existingEmails.has(t.companyEmail)
          );
          if (excludedRecords.length > 0) {
            logger.warn("Excluded duplicate corporate records", {
              excludedRecords: excludedRecords.map(
                (r: { cacNumber: string; companyEmail: string }) => ({
                  cacNumber: r.cacNumber,
                  companyEmail: r.companyEmail,
                })
              ),
            });
          }

          if (filteredBatch.length === 0) {
            logger.info("No new companies to insert", {
              batchSize: taxpayers.length,
            });
            channel!.ack(msg);
            return;
          }

          // Inserting companies into MongoDB
          let insertedCompanies: any[] = [];
          for (let attempt = 0; attempt < 4; attempt++) {
            try {
              for (let i = 0; i < filteredBatch.length; i += CHUNK_SIZE) {
                const result = await User.insertMany(
                  filteredBatch.slice(i, i + CHUNK_SIZE),
                  { ordered: false }
                );
                insertedCompanies.push(...result);
                const insertedCount = result.length;
                logger.info("Successfully inserted companies into MongoDB", {
                  batchSize: filteredBatch.length,
                  insertedCount,
                  failedCount: filteredBatch.length - insertedCount,
                });

                if (insertedCount < filteredBatch.length) {
                  const failedRecords = filteredBatch.filter(
                    (company: any) =>
                      !result.some(
                        (inserted: any) =>
                          inserted.cacNumber === company.cacNumber
                      )
                  );
                  logger.warn("Some companies failed to insert", {
                    failedRecords,
                  });
                }
              }
              break;
            } catch (insertError: any) {
              logger.error("Failed to insert company batch", {
                attempt,
                error: insertError.message,
                batchSize: filteredBatch.length,
                errorDetails: insertError.writeErrors || insertError,
              });
              if (attempt === 3) {
                logger.warn("Max retries reached, rejecting message", {
                  batchSize: filteredBatch.length,
                });
                channel!.nack(msg, false, true);
                return;
              }
              await new Promise((resolve) =>
                setTimeout(resolve, 300 * (attempt + 1))
              );
            }
          }

          // Send notifications
          if (insertedCompanies.length > 0) {
            for (const company of filteredBatch) {
              const insertedCompany = insertedCompanies.find(
                (inserted: any) => inserted.cacNumber === company.cacNumber
              );
              if (!insertedCompany) continue;

              const companyName = company.companyName;

              const emailData = {
                email: company.companyEmail,
                name: companyName,
                accountType: "company",
                tin: insertedCompany.tin,
                profileLink: "https://akirs.ibomtax.ng/company-profile",
                unsubscribeLink: "https://akirs.ibomtax.ng/unsubscribe",
              };
              await sendUserMessage(BULK_TAXPAYER_EMAIL_TOPIC, emailData);
              logger.info("Queued email notification for company", {
                email: company.companyEmail,
                tin: insertedCompany.tin,
              });

              const normalizedPhone = normalizePhoneNumber(company.phone);
              const smsData = {
                phone: normalizedPhone,
                message: `Hi ${companyName}, Your company is registered with AKIRS! TaxPayer Id: ${insertedCompany.tin}, Password: ${company.plaintextPassword}. Visit ${process.env.WEB_ORIGIN}/auth/signin for details.`,
              };
              await sendUserMessage(BULK_TAXPAYER_SMS_TOPIC, smsData);
              logger.info("Queued SMS notification for company", {
                phone: company.phone,
                tin: insertedCompany.tin,
              });
            }
          }

          channel!.ack(msg);
        } catch (error: any) {
          logger.error(
            "Error processing bulk corporate taxpayer creation message",
            {
              error: error.message,
            }
          );
          channel!.nack(msg, false, true);
        }
      },
      { noAck: false }
    );
  } catch (error) {
    logger.error("Failed to start bulk corporate taxpayer creation worker", {
      error,
    });
    throw error;
  }
};
