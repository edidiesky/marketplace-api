import logger from "../utils/logger";
import {
  BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC,
  BULK_TAXPAYER_EMAIL_TOPIC,
  BULK_TAXPAYER_RESULT_TOPIC,
  BULK_TAXPAYER_SMS_TOPIC,
  CHUNK_SIZE,
  INDIVIDUAL_TAXPAYER_TEMPLATE,
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
  UploadType,
  UserRequestUploadStatus,
} from "../models/UploadProgress";

interface IError {
  message: string;
  requestId: string;
  employeeTin: string;
  row?: number;
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
  nin: string;
  address: string;
  employmentStatus: string;
  employerTin: string;
  employerName: string;
  stateOfResidence: string;
  lgaOfResidence: string;
  rowCount: number;
  profileImage?: string;
  directorate: string;
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
      bom: true,
      cast: (value, context) => {
        if (typeof value === "string") {
          return value.trim();
        }
        return value;
      },
    });
    const stream = Readable.from(csvData);
    stream
      .pipe(parser)
      .on("data", (record) => records.push(record))
      .on("end", () => {
        logger.info("CSV parsed", {
          initialLines: (csvData.match(/\n/g) || []).length,
          validRecords: records.length,
        });
        resolve(records);
      })
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
    "NIN",
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

    const progressPercent =
      progressData.totalTaxpayers > 0
        ? Math.min(
            (progressData.processed / progressData.totalTaxpayers) * 100,
            100
          )
        : 0;

    let status: UserRequestUploadStatus;
    if (
      progressData.totalTaxpayers > 0 &&
      progressData.processed === progressData.totalTaxpayers
    ) {
      status =
        progressData.failed > 0
          ? UserRequestUploadStatus.FAILED
          : UserRequestUploadStatus.COMPLETED;
    } else {
      status = UserRequestUploadStatus.IN_PROGRESS;
    }

    const updateData: any = {
      message: progressData,
      status,
      progress: progressPercent,
      updatedAt: new Date(),
      uploadType: UploadType.TAXPAYER_BULK_UPLOAD,
    };

    if (
      progressData.totalTaxpayers > 0 &&
      progressData.processed === progressData.totalTaxpayers
    ) {
      updateData.completedAt = new Date();
    }

    await Promise.all([
      redisClient.setex(
        progressKey,
        SECONDS_IN_7_DAYS,
        JSON.stringify(progressData)
      ),
      // Only update MongoDB if not final state (avoid race conditions)
      progressData.processed < progressData.totalTaxpayers ||
      progressData.failed > 0
        ? UploadProgress.findOneAndUpdate(
            { userId: employerTin, requestId },
            updateData,
            { upsert: true, new: true }
          )
        : Promise.resolve(),
    ]);

    logger.info("Progress updated", {
      requestId,
      processed: progressData.processed,
      total: progressData.totalTaxpayers,
      status,
      failed: progressData.failed,
      successful: progressData.successful,
      progressPercent: progressPercent.toFixed(2),
    });
  } catch (error) {
    logger.error("Failed to update progress", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      progressKey,
      requestId,
      employerTin,
    });
  }
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

export const BulkIndividualTaxpayerWorker = async (
  rabbitChannel: amqp.Channel
) => {
  const channel = rabbitChannel;
  const limiter = new Bottleneck({ maxConcurrent: 10, minTime: 100 });

  try {
    await channel.assertExchange(USER_EXCHANGE, "topic", { durable: true });
    await channel.assertQueue(QUEUES[BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC], {
      durable: true,
    });
    await channel.bindQueue(
      QUEUES[BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC],
      USER_EXCHANGE,
      BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC
    );

    logger.info(
      `Consuming queue ${QUEUES[BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC]} for topic ${BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC}`
    );

    await channel.consume(
      QUEUES[BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC],
      async (msg) => {
        if (!msg) return;

        const messageContent = JSON.parse(msg.content.toString());
        const { requestId, csvUrl, publicId, employerTin, name } =
          messageContent;
        const progressKey = `bulk_national_taxpayer_upload_progress:${publicId}:${employerTin}`;
        let errors: IError[] = [];

        // Helper function to fail the upload with all errors
        const failUpload = async (allErrors: IError[]) => {
          await UploadProgress.findOneAndUpdate(
            { userId: employerTin, requestId },
            {
              message: {
                totalTaxpayers: 0,
                processed: 0,
                successful: 0,
                failed: allErrors.length,
                errors: allErrors,
                startTime: Date.now(),
              },
              status: UserRequestUploadStatus.FAILED,
              progress: 0,
              completedAt: new Date(),
              updatedAt: new Date(),
              uploadType: UploadType.TAXPAYER_BULK_UPLOAD,
            },
            { upsert: true }
          );

          await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
            publicId,
            userId: employerTin,
            requestId,
            status: "error",
            message: `Validation failed: ${allErrors.length} error(s) found. Please fix all errors and re-upload.`,
            errors: allErrors,
          });

          logger.error("Upload failed with validation errors", {
            publicId,
            errorCount: allErrors.length,
            errors: allErrors,
          });

          channel.ack(msg);
        };

        try {
          // Initialize progress tracking in MongoDB at the start
          await UploadProgress.findOneAndUpdate(
            { userId: employerTin, requestId },
            {
              message: {
                totalTaxpayers: 0,
                processed: 0,
                successful: 0,
                failed: 0,
                errors: [],
                startTime: Date.now(),
              },
              status: UserRequestUploadStatus.IN_PROGRESS,
              progress: 0,
              updatedAt: new Date(),
              uploadType: UploadType.TAXPAYER_BULK_UPLOAD,
            },
            { upsert: true, new: true }
          );

          // Download CSV
          let rawCsvData: string;
          try {
            const response = await axios.get(csvUrl, { responseType: "text" });
            rawCsvData = response.data;
            logger.info("CSV download successful", { csvUrl, publicId });
          } catch (error: any) {
            errors.push({
              message: `Failed to download CSV: ${error.message}`,
              requestId,
              employeeTin: employerTin,
              row: 0,
            });
            await failUpload(errors);
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
            await failUpload(errors);
            return;
          }

          if (rowCount > MAX_ROWS) {
            errors.push({
              message: `Row count exceeds ${MAX_ROWS} limit`,
              requestId,
              employeeTin: employerTin,
              row: 0,
            });
            await failUpload(errors);
            return;
          }

          // Parse CSV
          let records: any[];
          try {
            records = await parseCSVStream(rawCsvData);
            await updateUploadProgress(
              progressKey,
              "success",
              employerTin,
              undefined,
              requestId
            );
            logger.info("CSV parsed - progress updated", {
              records: records.length,
            });
          } catch (error: any) {
            errors.push({
              message: `Failed to parse CSV: ${error.message}`,
              requestId,
              employeeTin: employerTin,
              row: 0,
            });
            await failUpload(errors);
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

          // Update MongoDB with total count
          await UploadProgress.findOneAndUpdate(
            { userId: employerTin, requestId },
            {
              "message.totalTaxpayers": records.length,
              status: UserRequestUploadStatus.VALIDATING,
              updatedAt: new Date(),
              
            }
          );

          // Validate headers
          const headers = Object.keys(records[0] || {});
          const missingHeaders = INDIVIDUAL_TAXPAYER_TEMPLATE.filter(
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
            await failUpload(errors);
            return;
          }

          // PHASE 1: VALIDATE ALL ROWS (collect all errors, don't stop)
          logger.info("Starting validation phase", {
            totalRecords: records.length,
          });
          const taxpayerRecords: ITaxpayerData[] = [];
          const validationErrors: IError[] = [];

          for (let i = 0; i < records.length; i += CHUNK_SIZE) {
            const batch = records.slice(i, i + CHUNK_SIZE);
            const batchResults = await Promise.all(
              batch.map(async (row, index) => {
                const rowCount = i + index + 1;
                try {
                  // Basic field validation
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
                  const ninResult = await verifyNIN(
                    normalizedRow.NIN,
                    normalizedRow.FIRSTNAME,
                    normalizedRow.LASTNAME,
                    rowCount
                  );

                  if (!ninResult.isValid) {
                    return {
                      errors: [
                        {
                          message: `NIN verification failed: ${
                            ninResult.error || "Invalid NIN"
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
                    lga: ninResult.lga || normalizedRow.LGA_OF_ORIGIN,
                    state: ninResult.state || normalizedRow.STATE_OF_ORIGIN,
                    firstName: ninResult.firstName || normalizedRow.FIRSTNAME,
                    plaintextPassword: genPassword,
                    lastName: ninResult.lastName || normalizedRow.LASTNAME,
                    middleName:
                      ninResult.middleName || normalizedRow.MIDDLE_NAME || "",
                    dateOfBirth:
                      ninResult.dateOfBirth || normalizedRow.DATE_OF_BIRTH,
                    gender: ninResult.gender || normalizedRow.GENDER,
                    nationality: normalizedRow.NATIONALITY,
                    maritalStatus: normalizedRow.MARITAL_STATUS,
                    secondaryPhone: normalizePhoneNumber(
                      normalizedRow.SECONDARY_PHONE?.startsWith("0")
                        ? normalizedRow.SECONDARY_PHONE
                        : `0${normalizedRow.SECONDARY_PHONE}`
                    ),
                    position: normalizedRow.POSITION || "",
                    occupation: normalizedRow.POSITION || "",
                    nin: normalizedRow.NIN || "",
                    address: ninResult.address || normalizedRow.ADDRESS || "",
                    employmentStatus: "EMPLOYED",
                    employerTin,
                    employerName: name,
                    stateOfResidence:
                      ninResult.state ||
                      normalizedRow.STATE_OF_RESIDENCE ||
                      normalizedRow.STATE,
                    lgaOfResidence:
                      ninResult.lga ||
                      normalizedRow.LGA_OF_RESIDENCE ||
                      normalizedRow.LGA,
                    rowCount,
                    profileImage: ninResult.photoUrl,
                    directorate: "TAXPAYER",
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

            // Collect all errors (don't stop processing)
            for (const result of batchResults) {
              if (result.errors) {
                for (const err of result.errors) {
                  validationErrors.push({
                    message: err.message,
                    requestId,
                    employeeTin: employerTin,
                    row: err.row,
                  });
                }
              } else if (result.taxpayerData) {
                taxpayerRecords.push(result.taxpayerData);
              }
            }

            // Update progress (validation phase)
            const validatedSoFar = i + batch.length;
            const validationProgress = Math.min(
              (validatedSoFar / records.length) * 50, // 0-50% for validation
              50
            );
            await UploadProgress.findOneAndUpdate(
              { userId: employerTin, requestId },
              {
                progress: validationProgress,
                status: UserRequestUploadStatus.VALIDATING,
                updatedAt: new Date(),
              }
            );

            logger.info("Validation progress", {
              validated: validatedSoFar,
              total: records.length,
              errors: validationErrors.length,
            });
          }

          // If there are validation errors, fail immediately
          if (validationErrors.length > 0) {
            logger.error("Validation failed", {
              totalErrors: validationErrors.length,
              publicId,
            });
            await failUpload(validationErrors);
            return;
          }

          // PHASE 2: CHECK FOR DUPLICATES
          logger.info("Starting duplicate check phase", {
            recordsToCheck: taxpayerRecords.length,
          });

          await UploadProgress.findOneAndUpdate(
            { userId: employerTin, requestId },
            {
              progress: 60,
              status: UserRequestUploadStatus.VALIDATING,
              updatedAt: new Date(),
            }
          );

          const duplicates = await limiter.schedule(() =>
            verifyDuplicatesInBatch(
              taxpayerRecords.map((t) => ({
                tin: t.tin,
                email: t.email,
                rowCount: t.rowCount,
              }))
            )
          );

          // Check for duplicates
          const invalidDuplicates = duplicates.filter((d) => !d.isValid);
          if (invalidDuplicates.length > 0) {
            const duplicateErrors: IError[] = invalidDuplicates.map((dup) => ({
              message: `Duplicate ${dup.duplicateField}: ${
                dup.duplicateField === "TIN" ? dup.tin : dup.email
              } at row ${dup.rowCount}`,
              requestId,
              employeeTin: employerTin,
              row: dup.rowCount,
            }));

            logger.error("Duplicate check failed", {
              totalDuplicates: duplicateErrors.length,
              publicId,
            });
            await failUpload(duplicateErrors);
            return;
          }

          // PHASE 3: ALL VALIDATION PASSED - NOW INSERT ALL RECORDS
          logger.info("All validations passed, starting insertion", {
            recordsToInsert: taxpayerRecords.length,
          });

          await UploadProgress.findOneAndUpdate(
            { userId: employerTin, requestId },
            {
              progress: 70,
              status: UserRequestUploadStatus.INSERTING,
              updatedAt: new Date(),
            }
          );

          const validTaxpayers = taxpayerRecords;
          let insertedTaxpayers: any[] = [];

          // Insert all valid taxpayers
          for (let i = 0; i < validTaxpayers.length; i += CHUNK_SIZE) {
            const chunk = validTaxpayers.slice(i, i + CHUNK_SIZE);
            try {
              const result = await User.insertMany(chunk, { ordered: false });
              insertedTaxpayers.push(...result);

              // Update progress for insertions (70-100%)
              const insertedSoFar = insertedTaxpayers.length;
              const insertionProgress =
                70 + Math.min((insertedSoFar / validTaxpayers.length) * 30, 30);

              await UploadProgress.findOneAndUpdate(
                { userId: employerTin, requestId },
                {
                  progress: insertionProgress,
                  status: UserRequestUploadStatus.INSERTING,
                  "message.successful": insertedSoFar,
                  "message.processed": insertedSoFar,
                  updatedAt: new Date(),
                }
              );

              logger.info("Inserted taxpayer chunk", {
                chunkIndex: i / CHUNK_SIZE + 1,
                insertedCount: result.length,
                totalInserted: insertedTaxpayers.length,
              });
            } catch (error: any) {
              // Insertion failed - this shouldn't happen after validation
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
                  ? `Unexpected duplicate ${duplicateField}: ${duplicateValue} during insertion`
                  : `Duplicate key error: ${error.message}`;
              }

              const insertionErrors: IError[] = chunk.map((t) => ({
                message: errorMessage,
                requestId,
                employeeTin: employerTin,
                row: t.rowCount,
              }));

              logger.error("Insertion failed unexpectedly", {
                error: errorMessage,
                chunkIndex: i / CHUNK_SIZE + 1,
                publicId,
              });
              await failUpload(insertionErrors);
              return;
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

              // Queue email notification
              try {
                const emailData = {
                  email: originalTaxpayer.email,
                  name: fullName,
                  accountType: "individual",
                  tin: originalTaxpayer.tin,
                  password: originalTaxpayer.plaintextPassword,
                  profileLink,
                  unsubscribeLink: profileLink,
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
          await UploadProgress.findOneAndUpdate(
            { userId: employerTin, requestId },
            {
              message: {
                totalTaxpayers: records.length,
                processed: insertedTaxpayers.length,
                successful: insertedTaxpayers.length,
                failed: 0,
                errors: [],
                startTime: Date.now(),
              },
              status: UserRequestUploadStatus.COMPLETED,
              progress: 100,
              completedAt: new Date(),
              updatedAt: new Date(),
            },
            { upsert: true }
          );

          // Clear user cache
          try {
            const userRedisPattern = `redis:user:${employerTin}:*`;
            const userRedisKeys = await redisClient.keys(userRedisPattern);
            if (userRedisKeys.length > 0) {
              await redisClient.del(userRedisKeys);
            }
          } catch (cacheError) {
            logger.warn("Failed to clear user cache", { error: cacheError });
          }

          logger.info("Bulk taxpayer processing completed successfully", {
            publicId,
            insertedCount: insertedTaxpayers.length,
          });

          channel.ack(msg);
        } catch (error: any) {
          // Unexpected error
          const unexpectedError: IError[] = [
            {
              message: `Processing failed: ${error.message}`,
              requestId,
              employeeTin: employerTin,
              row: 0,
            },
          ];
          await failUpload(unexpectedError);
          logger.error("Bulk taxpayer worker error", {
            error: error.message,
            stack: error.stack,
            requestId,
            publicId,
          });
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
