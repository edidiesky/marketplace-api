import logger from "../utils/logger";
import {
  BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC,
  BULK_TAXPAYER_EMAIL_TOPIC,
  BULK_TAXPAYER_RESULT_TOPIC,
  BULK_TAXPAYER_SMS_TOPIC,
  CHUNK_SIZE,
  EXPARTIATE_TAXPAYER_TEMPLATE,
  MAX_FILE_SIZE,
  MAX_ROWS,
  QUEUES,
  SECONDS_IN_1_DAY,
  SECONDS_IN_7_DAYS,
  USER_EXCHANGE,
} from "../constants";
import csvParse from "csv-parse";
import { Readable } from "stream";
import Bottleneck from "bottleneck";
import amqp from "amqplib";
import axios from "axios";
import User, { IUser, UserType } from "../models/User";
import redisClient from "../config/redis";
import { sendUserMessage } from "../messaging/producer";
import { getSingleTINFromPool } from "../utils/generateTIN";
import { generateUniquePassword } from "../utils/generatePassword";
import { normalizePhoneNumber } from "../utils/normalizePhoneNumber";
import bcrypt from "bcrypt";
import { v4 } from "uuid";
import { verifyNIN } from "../utils/verifyNIN";
import UploadProgress, {
  UserRequestUploadStatus,
} from "../models/UploadProgress";
import { veriFyBVN } from "../utils/veriFyBVN";

// Interfaces
interface IError {
  message: string;
  requestId: string;
  employeeTin: string;
  row?: number; // Added to track row number
}

export interface IProgressTracker {
  totalTaxpayers: number;
  processed: number;
  successful: number;
  failed: number;
  errors: IError[];
  startTime: number;
}

interface ITaxpayerData {
  userType: UserType;
  tin: string;
  passwordHash: string;
  email: string;
  phone: string;
  lga: string;
  state: string;
  firstName: string;
  plaintextPassword: string;
  lastName: string;
  middleName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  maritalStatus: string;
  secondaryPhone: string;
  position: string;
  occupation: string;
  bvn: string;
  address: string;
  employmentStatus: string;
  employerTin: string;
  employerName: string;
  stateOfResidence: string;
  lgaOfResidence: string;
  rowCount: number;
  profileImage?: string;
}

/**
 * @description Parse CSV string into records
 */
async function parseCSVStream(csvData: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    const parser = csvParse.parse({
      columns: true,
      trim: true,
      skip_empty_lines: true,
    });
    const stream = Readable.from(csvData);
    stream
      .pipe(parser)
      .on("data", (record) => records.push(record))
      .on("end", () => resolve(records))
      .on("error", (err) => reject(err));
  });
}

/**
 * @description Validate row data
 */
function validateRowData(
  row: any,
  rowCount: number
): { errors?: { message: string; row: number }[] } {
  const requiredFields = [
    "FIRSTNAME",
    "LASTNAME",
    "EMAIL",
    "PHONE",
    "ADDRESS",
    "LGA_OF_ORIGIN",
    "STATE_OF_ORIGIN",
    "GENDER",
    "NATIONALITY",
    "MARITAL_STATUS",
    "BVN",
    "STATE_OF_RESIDENCE",
  ];
  const errors: { message: string; row: number }[] = [];

  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === "") {
      errors.push({ message: `Missing or empty ${field}`, row: rowCount });
    }
  }

  if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(row.EMAIL)) {
    errors.push({ message: `Invalid email format`, row: rowCount });
  }

  return errors.length > 0 ? { errors } : {};
}

/**
 * @description Verify TINs and emails in batch
 */
async function verifyDuplicatesInBatch(
  records: { tin: string; email: string; rowCount: number }[]
): Promise<
  {
    tin: string;
    email: string;
    rowCount: number;
    isValid: boolean;
    duplicateField?: string;
  }[]
> {
  const tins = records.map((r) => r.tin);
  const emails = records.map((r) => r.email);
  const results = await User.find({
    $or: [{ tin: { $in: tins } }, { email: { $in: emails } }],
  }).select("tin email");
  const existingTins = new Set(results.map((user) => user.tin));
  const existingEmails = new Set(results.map((user) => user.email));
  return records.map(({ tin, email, rowCount }) => {
    const isTinDuplicate = existingTins.has(tin);
    const isEmailDuplicate = existingEmails.has(email);
    return {
      tin,
      email,
      rowCount,
      isValid: !isTinDuplicate && !isEmailDuplicate,
      duplicateField: isTinDuplicate
        ? "TIN"
        : isEmailDuplicate
        ? "email"
        : undefined,
    };
  });
}

/**
 * @description Get taxpayer upload progress in Redis
 */
export async function getProgress(
  progressKey: string
): Promise<IProgressTracker> {
  const progressContent = await redisClient.get(progressKey);
  return progressContent
    ? JSON.parse(progressContent)
    : {
        totalTaxpayers: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        startTime: Date.now(),
      };
}

/**
 * @description Update upload status data in Redis and MongoDB
 */
export async function updateUploadProgress(
  progressKey: string,
  type: "success" | "failure",
  employerTin: string,
  error?: string,
  requestId?: string,
  row?: number
): Promise<void> {
  try {
    const progressData = await getProgress(progressKey);
    progressData.processed += 1;
    if (type === "success") {
      progressData.successful += 1;
    } else {
      progressData.failed += 1;
      if (error && requestId) {
        progressData.errors.push({
          message: error,
          employeeTin: employerTin,
          requestId,
          row,
        });
      }
    }
    const progressPercent = Math.min(
      (progressData.processed / progressData.totalTaxpayers) * 100,
      100
    );
    const status =
      progressData.processed === progressData.totalTaxpayers
        ? progressData.failed > 0
          ? UserRequestUploadStatus.FAILED // Set to FAILED if any failures
          : UserRequestUploadStatus.COMPLETED
        : UserRequestUploadStatus.IN_PROGRESS;

    await Promise.all([
      redisClient.setex(
        progressKey,
        SECONDS_IN_7_DAYS,
        JSON.stringify(progressData)
      ),
      UploadProgress.findOneAndUpdate(
        { userId: employerTin, requestId }, // Use employerTin consistently
        {
          message: progressData,
          status,
          progress: progressPercent,
          updatedAt: new Date(),
          ...(status === UserRequestUploadStatus.FAILED ||
          status === UserRequestUploadStatus.COMPLETED
            ? { completedAt: new Date() }
            : {}),
        },
        { upsert: true }
      ),
    ]);
  } catch (error) {
    logger.error("Failed to update progress", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * @description Worker for bulk taxpayer onboarding
 */
export const BulkExpartiateTaxpayerWorker = async (
  rabbitChannel: amqp.Channel
) => {
  const channel = rabbitChannel;
  const limiter = new Bottleneck({ maxConcurrent: 10, minTime: 100 });

  try {
    await channel.assertExchange(USER_EXCHANGE, "topic", { durable: true });
    await channel.assertQueue(QUEUES[BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC], {
      durable: true,
    });
    await channel.bindQueue(
      QUEUES[BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC],
      USER_EXCHANGE,
      BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC
    );

    logger.info(
      `Consuming queue ${QUEUES[BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC]} for topic ${BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC}`
    );

    await channel.consume(
      QUEUES[BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC],
      async (msg) => {
        if (!msg) return;

        const messageContent = JSON.parse(msg.content.toString());
        const { requestId, csvUrl, publicId, employerTin, name } =
          messageContent;
        const progressKey = `bulk_national_taxpayer_upload_progress:${publicId}:${employerTin}`;
        let errors: IError[] = [];

        try {
          // Download CSV
          let rawCsvData: string;
          try {
            const response = await axios.get(csvUrl, { responseType: "text" });
            rawCsvData = response.data;
            logger.info("CSV download successful", { csvUrl, publicId });
          } catch (error: any) {
            errors.push({
              message: `Failed to download Expartiate CSV: ${error.message}`,
              requestId,
              employeeTin: employerTin,
              row: 0,
            });
            await updateUploadProgress(
              progressKey,
              "failure",
              employerTin,
              errors[0].message,
              requestId,
              0
            );
            await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
              publicId,
              userId: employerTin,
              requestId,
              status: "error",
              message: "Failed to download CSV",
              errors,
            });
            channel.ack(msg);
            return;
          }

          // Validate file size and row count
          const fileSize = Buffer.byteLength(rawCsvData, "utf8");
          const rowCount = (rawCsvData.match(/\n/g) || []).length;
          if (fileSize > MAX_FILE_SIZE) {
            errors.push({
              message: "File size exceeds 10MB limit",
              requestId,
              employeeTin: employerTin,
              row: 0,
            });
            await updateUploadProgress(
              progressKey,
              "failure",
              employerTin,
              errors[0].message,
              requestId,
              0
            );
            await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
              publicId,
              userId: employerTin,
              requestId,
              status: "error",
              message: "File size exceeds 10MB limit",
              errors,
            });
            channel.ack(msg);
            return;
          }
          if (rowCount > MAX_ROWS) {
            errors.push({
              message: `Row count exceeds ${MAX_ROWS} limit`,
              requestId,
              employeeTin: employerTin,
              row: 0,
            });
            await updateUploadProgress(
              progressKey,
              "failure",
              employerTin,
              errors[0].message,
              requestId,
              0
            );
            await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
              publicId,
              userId: employerTin,
              requestId,
              status: "error",
              message: `Row count exceeds ${MAX_ROWS} limit`,
              errors,
            });
            channel.ack(msg);
            return;
          }

          // Parse CSV
          let records: any[];
          try {
            records = await parseCSVStream(rawCsvData);
            logger.info("CSV parsed successfully", {
              recordCount: records.length,
              publicId,
            });
          } catch (error: any) {
            errors.push({
              message: `Failed to parse CSV: ${error.message}`,
              requestId,
              employeeTin: employerTin,
              row: 0,
            });
            await updateUploadProgress(
              progressKey,
              "failure",
              employerTin,
              errors[0].message,
              requestId,
              0
            );
            await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
              publicId,
              userId: employerTin,
              requestId,
              status: "error",
              message: "Failed to parse CSV",
              errors,
            });
            channel.ack(msg);
            return;
          }

          // Update progress with total taxpayers
          const progress = await getProgress(progressKey);
          progress.totalTaxpayers = records.length;
          await redisClient.setex(
            progressKey,
            SECONDS_IN_7_DAYS,
            JSON.stringify(progress)
          );

          // Validate headers
          const headers = Object.keys(records[0] || {});
          const missingHeaders = EXPARTIATE_TAXPAYER_TEMPLATE.filter(
            (h) => !headers.includes(h)
          );
          if (missingHeaders.length > 0) {
            errors.push({
              message: `CSV header mismatch. Missing: ${missingHeaders.join(
                ", "
              )}`,
              requestId,
              employeeTin: employerTin,
              row: 0,
            });
            await updateUploadProgress(
              progressKey,
              "failure",
              employerTin,
              errors[0].message,
              requestId,
              0
            );
            await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
              publicId,
              userId: employerTin,
              requestId,
              status: "error",
              message: errors[0].message,
              errors,
            });
            channel.ack(msg);
            return;
          }

          // Process records in batches
          const taxpayerRecords: ITaxpayerData[] = [];
          for (let i = 0; i < records.length; i += CHUNK_SIZE) {
            const batch = records.slice(i, i + CHUNK_SIZE);
            const batchResults = await Promise.all(
              batch.map(async (row, index) => {
                const rowCount = i + index + 1;
                try {
                  const validationResult = validateRowData(row, rowCount);
                  if (validationResult.errors) {
                    return { errors: validationResult.errors };
                  }

                  const normalizedRow = {
                    ...row,
                    POSITION: row.POSITION
                      ? row.POSITION.toUpperCase().replace(" ", "_")
                      : "",
                    GENDER: row.GENDER?.toUpperCase(),
                    MARITAL_STATUS: row.MARITAL_STATUS?.toUpperCase(),
                  };

                  // Verify NIN
                  const bvnResult = await veriFyBVN(
                    normalizedRow.NIN,
                    normalizedRow.FIRSTNAME,
                    normalizedRow.LASTNAME,
                    rowCount
                  );
                  if (!bvnResult.isValid) {
                    return {
                      errors: [
                        {
                          message: `NIN verification failed: ${
                            bvnResult.error || "Invalid NIN"
                          }`,
                          row: rowCount,
                        },
                      ],
                    };
                  }

                  const tin =
                    row.TIN?.trim() ||
                    (await getSingleTINFromPool("INDIVIDUAL", 4));
                  const genPassword = generateUniquePassword();
                  const salt = await bcrypt.genSalt(10);
                  const hashedPassword = await bcrypt.hash(genPassword, salt);

                  const taxpayerData: ITaxpayerData = {
                    userType: UserType.INDIVIDUAL,
                    tin,
                    passwordHash: hashedPassword,
                    email: normalizedRow.EMAIL,
                    phone: normalizePhoneNumber(
                      normalizedRow.PHONE.startsWith("0")
                        ? normalizedRow.PHONE
                        : `0${normalizedRow.PHONE}`
                    ),
                    lga: bvnResult.lga || normalizedRow.LGA_OF_ORIGIN,
                    state: bvnResult.state || normalizedRow.STATE_OF_ORIGIN,
                    firstName: bvnResult.firstName || normalizedRow.FIRSTNAME,
                    plaintextPassword: genPassword,
                    lastName: bvnResult.lastName || normalizedRow.LASTNAME,
                    middleName:
                      bvnResult.middleName || normalizedRow.MIDDLE_NAME || "",
                    dateOfBirth:
                      bvnResult.dateOfBirth || normalizedRow.DATE_OF_BIRTH,
                    gender: bvnResult.gender || normalizedRow.GENDER,
                    nationality: "FOREIGN",
                    maritalStatus: normalizedRow.MARITAL_STATUS,
                    secondaryPhone: normalizePhoneNumber(
                      normalizedRow.SECONDARY_PHONE?.startsWith("0")
                        ? normalizedRow.SECONDARY_PHONE
                        : `0${normalizedRow.SECONDARY_PHONE}`
                    ),
                    position: normalizedRow.POSITION || "",
                    occupation: normalizedRow.POSITION || "",
                    bvn: normalizedRow.BVN || "",
                    address: bvnResult.address || normalizedRow.ADDRESS || "",
                    employmentStatus: "EMPLOYED",
                    employerTin,
                    employerName: name,
                    stateOfResidence:
                      bvnResult.state ||
                      normalizedRow.STATE_OF_RESIDENCE ||
                      normalizedRow.STATE,
                    lgaOfResidence:
                      bvnResult.lga ||
                      normalizedRow.LGA_OF_RESIDENCE ||
                      normalizedRow.LGA,
                    rowCount,
                    profileImage: bvnResult.photoUrl,
                  };

                  return { taxpayerData };
                } catch (error: any) {
                  return {
                    errors: [
                      {
                        message: `Row ${rowCount}: ${error.message}`,
                        row: rowCount,
                      },
                    ],
                  };
                }
              })
            );

            batchResults.forEach((result) => {
              if (result.taxpayerData) {
                taxpayerRecords.push(result.taxpayerData);
              } else if (result.errors) {
                result.errors.forEach((err: any) =>
                  errors.push({
                    message: err.message,
                    requestId,
                    employeeTin: employerTin,
                    row: err.row,
                  })
                );
                updateUploadProgress(
                  progressKey,
                  "failure",
                  employerTin, // Use employerTin
                  result.errors[0].message,
                  requestId,
                  result.errors[0].row
                );
              }
            });
          }

          // Verify TINs and emails
          const duplicates = await limiter.schedule(() =>
            verifyDuplicatesInBatch(
              taxpayerRecords.map((t) => ({
                tin: t.tin,
                email: t.email,
                rowCount: t.rowCount,
              }))
            )
          );
          const validTaxpayers = taxpayerRecords.filter(
            (t) =>
              duplicates.find(
                (d) =>
                  d.tin === t.tin &&
                  d.email === t.email &&
                  d.rowCount === t.rowCount
              )?.isValid
          );
          duplicates
            .filter((d) => !d.isValid)
            .forEach(({ tin, email, duplicateField, rowCount }) => {
              const message = `Duplicate ${duplicateField}: ${
                duplicateField === "TIN" ? tin : email
              } at row ${rowCount}`;
              errors.push({
                message,
                requestId,
                employeeTin: employerTin, // Use employerTin
                row: rowCount,
              });
              updateUploadProgress(
                progressKey,
                "failure",
                employerTin,
                message,
                requestId,
                rowCount
              );
            });

          // Insert valid taxpayers in batches
          let insertedTaxpayers: any[] = [];
          for (let i = 0; i < validTaxpayers.length; i += CHUNK_SIZE) {
            const chunk = validTaxpayers.slice(i, i + CHUNK_SIZE);
            try {
              const result = await User.insertMany(chunk, { ordered: false });
              insertedTaxpayers.push(...result);
              chunk.forEach(
                (t) =>
                  updateUploadProgress(
                    progressKey,
                    "success",
                    employerTin,
                    undefined,
                    requestId,
                    t.rowCount
                  ) // Use employerTin
              );
              logger.info("Inserted taxpayer chunk", {
                chunkIndex: i / CHUNK_SIZE + 1,
                insertedCount: result.length,
              });
            } catch (error: any) {
              let errorMessage = error.message;
              if (error.code === 11000) {
                const match =
                  error.message.match(/dup key: { email: "([^"]+)" }/) ||
                  error.message.match(/dup key: { tin: "([^"]+)" }/);
                const duplicateValue = match ? match[1] : null;
                const duplicateField = error.message.includes("email_1")
                  ? "email"
                  : "TIN";
                errorMessage = duplicateValue
                  ? `Duplicate ${duplicateField}: ${duplicateValue} at row ${
                      chunk.find(
                        (t) =>
                          t[duplicateField as keyof ITaxpayerData] ===
                          duplicateValue
                      )?.rowCount || "unknown"
                    }`
                  : `Duplicate key error: ${error.message}`;
              }
              chunk.forEach((t) => {
                errors.push({
                  message: errorMessage,
                  requestId,
                  employeeTin: employerTin, // Use employerTin
                  row: t.rowCount,
                });
                updateUploadProgress(
                  progressKey,
                  "failure",
                  employerTin,
                  errorMessage,
                  requestId,
                  t.rowCount
                ); // Use employerTin
              });
              logger.warn("Chunk insertion failed", {
                error: errorMessage,
                chunkIndex: i / CHUNK_SIZE + 1,
              });
            }
          }

          // Update user cache
          for (const taxpayer of insertedTaxpayers) {
            await redisClient.setex(
              `user:${taxpayer.tin}`,
              SECONDS_IN_1_DAY,
              JSON.stringify(taxpayer)
            );
          }

          // Process notifications for successfully inserted taxpayers
          if (insertedTaxpayers.length > 0) {
            logger.info("Processing notifications for inserted taxpayers", {
              count: insertedTaxpayers.length,
            });

            for (const insertedTaxpayer of insertedTaxpayers) {
              const originalTaxpayer = validTaxpayers.find(
                (t) => t.tin === insertedTaxpayer.tin
              );

              if (!originalTaxpayer) {
                logger.warn("Could not find original taxpayer data", {
                  tin: insertedTaxpayer.tin,
                });
                continue;
              }

              const fullName =
                `${originalTaxpayer.firstName} ${originalTaxpayer.lastName}`.trim();
              const profileLink = `${
                process.env.WEB_ORIGIN ||
                process.env.WEB_ORIGIN2 ||
                process.env.WEB_ORIGIN3
              }/auth/signin`;
              const unsubscribeLink = profileLink;

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
                  notificationId: v4(),
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
          await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
            publicId,
            userId: employerTin,
            requestId,
            status: insertedTaxpayers.length > 0 ? "success" : "error",
            message:
              insertedTaxpayers.length > 0
                ? `Successfully processed ${insertedTaxpayers.length} taxpayer records`
                : "Failed to process taxpayer records",
            insertedCount: insertedTaxpayers.length,
            errors,
          });

          logger.info("Bulk taxpayer processing completed", {
            publicId,
            insertedCount: insertedTaxpayers.length,
            errorCount: errors.length,
          });

          channel.ack(msg);
        } catch (error: any) {
          errors.push({
            message: `Processing failed: ${error.message}`,
            requestId,
            employeeTin: employerTin,
            row: 0,
          });
          await updateUploadProgress(
            progressKey,
            "failure",
            employerTin,
            error.message,
            requestId,
            0
          );
          await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
            publicId,
            userId: employerTin,
            requestId,
            status: "error",
            message: "Processing failed",
            errors,
          });
          channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
  } catch (error) {
    logger.error("Failed to start bulk taxpayer worker", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};
