import logger from "../utils/logger";
import {
  BULK_COMPANY_UPLOAD_TOPIC,
  BULK_TAXPAYER_EMAIL_TOPIC,
  BULK_TAXPAYER_RESULT_TOPIC,
  BULK_TAXPAYER_SMS_TOPIC,
  CHUNK_SIZE,
  MAX_FILE_SIZE,
  MAX_ROWS,
  QUEUES,
  SECONDS_IN_1_DAY,
  SECONDS_IN_7_DAYS,
  USER_EXCHANGE,
} from "../constants";
import Bottleneck from "bottleneck";
import amqp from "amqplib";
import axios from "axios";
import User, { UserType, InstitutionType, BranchType } from "../models/User";
import redisClient from "../config/redis";
import { sendUserMessage } from "../messaging/producer";
import { getSingleTINFromPool } from "../utils/generateTIN";
import { generateUniquePassword } from "../utils/generatePassword";
import { normalizePhoneNumber } from "../utils/normalizePhoneNumber";
import bcrypt from "bcrypt";
import UploadProgress, {
  UploadType,
  UserRequestUploadStatus,
} from "../models/UploadProgress";
import { getBranchTemplate } from "../utils/getBranchTemplate";
import { validateBranchRowData } from "../validators/companyBranch.validator";
import { parseCSVStream } from "../utils/parseCsvData";
import { veriFyCAC } from "../utils/verifyCAC";
import { getOperationalZone } from "../utils/getOperationalZone";
import { v4 } from "uuid";

// Interfaces
interface IError {
  message: string;
  requestId: string;
  adminTIN: string;
  row?: number;
}

export interface ICompanyBulkUploadProgressTracker {
  totalBranches: number;
  processed: number;
  successful: number;
  failed: number;
  errors: IError[];
  startTime: number;
}

interface ICompanyData {
  userType: UserType.COMPANY;
  tin: string;
  passwordHash: string;
  plaintextPassword: string;
  companyName: string;
  cacNumber: string;
  companyType: string;
  registrationDate: Date;
  companyEmail: string;
  email: string;
  natureOfBusiness?: string;
  phone: string;
  secondaryPhone?: string;
  address: string;
  currentAddress?: string;
  lgaOfOperation: string;
  state: string;
  city: string;
  businessSector: string;
  // proofOfResidency: string;
  institutionType: InstitutionType;
  branchType?: BranchType;
  parentCompanyTin?: string;
  // Institution-specific
  operationalName?: string;
  branchLocation?: string;
  numberOfBeds?: string;
  operateMortuary?: boolean;
  runLaboratory?: boolean;
  bankOperationalName?: string;
  bankIsBranchOffice?: boolean;
  bankBranchLocation?: string;
  oilGasOperationalName?: string;
  oilGasIsBranchOffice?: boolean;
  oilGasBranchLocation?: string;
  petroOperationalName?: string;
  petroIsBranchOffice?: boolean;
  petroBranchLocation?: string;
  numberOfPumps?: string;
  rowCount?: number;
  operationalZone: string;
  headOfficeAddress?: string;
  
}

/**
 * Get progress from Redis
 */
export async function getCompanyBulkDataProgress(
  progressKey: string
): Promise<ICompanyBulkUploadProgressTracker> {
  const content = await redisClient.get(progressKey);
  return content
    ? JSON.parse(content)
    : {
        totalBranches: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        startTime: Date.now(),
      };
}

/**
 * Update progress (reuse your function, adapted for branches)
 */
export async function updateUploadProgress(
  progressKey: string,
  type: "success" | "failure",
  adminTIN: string,
  error?: string | IError[],
  requestId?: string,
  row?: number
): Promise<void> {
  try {
    const progressData = await getCompanyBulkDataProgress(progressKey);
    progressData.processed += 1;

    if (type === "success") {
      progressData.successful += 1;
    } else {
      progressData.failed += 1;
      if (error && requestId) {
        if (Array.isArray(error)) {
          progressData.errors.push(...error);
        } else {
          progressData.errors.push({
            message: error,
            adminTIN,
            requestId,
            row,
          });
        }
      }
    }

    const progressPercent =
      progressData.totalBranches > 0
        ? Math.min(
            (progressData.processed / progressData.totalBranches) * 100,
            100
          )
        : 0;

    let status: UserRequestUploadStatus;
    if (
      progressData.totalBranches > 0 &&
      progressData.processed === progressData.totalBranches
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
      uploadType: UploadType.COMPANY_BULK_UPLOAD,
    };

    if (
      progressData.totalBranches > 0 &&
      progressData.processed === progressData.totalBranches
    ) {
      updateData.completedAt = new Date();
    }

    await Promise.all([
      redisClient.setex(
        progressKey,
        SECONDS_IN_7_DAYS,
        JSON.stringify(progressData)
      ),
      progressData.processed < progressData.totalBranches ||
      progressData.failed > 0
        ? UploadProgress.findOneAndUpdate(
            { userId: adminTIN, requestId },
            updateData,
            { upsert: true, new: true }
          )
        : Promise.resolve(),
    ]);

    logger.info("Progress updated", {
      requestId,
      processed: progressData.processed,
      total: progressData.totalBranches,
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
      adminTIN,
    });
  }
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

export const BulkCompanyCreationWorker = async (
  rabbitChannel: amqp.Channel
) => {
  const channel = rabbitChannel;
  const limiter = new Bottleneck({ maxConcurrent: 20, minTime: 100 });
  try {
    await channel.assertExchange(USER_EXCHANGE, "topic", { durable: true });
    await channel.assertQueue(QUEUES[BULK_COMPANY_UPLOAD_TOPIC], {
      durable: true,
    });
    await channel.bindQueue(
      QUEUES[BULK_COMPANY_UPLOAD_TOPIC],
      USER_EXCHANGE,
      BULK_COMPANY_UPLOAD_TOPIC
    );

    logger.info(`Consuming ${QUEUES[BULK_COMPANY_UPLOAD_TOPIC]}`);

    await channel.consume(
      QUEUES[BULK_COMPANY_UPLOAD_TOPIC],
      async (msg) => {
        try {
          if (!msg) return;
          const { requestId, csvUrl, publicId, adminTIN, institutionType } =
            JSON.parse(msg.content.toString());
          const progressKey = `bulk_company_upload_progress:${publicId}:${adminTIN}`;
          const failUpload = async (allErrors: IError[]) => {
            await updateUploadProgress(
              progressKey,
              "failure",
              adminTIN,
              `Upload failed: ${allErrors.length} errors`,
              requestId
            );
            await UploadProgress.findOneAndUpdate(
              { userId: adminTIN, requestId },
              {
                message: {
                  totalBranches: 0,
                  processed: 0,
                  successful: 0,
                  failed: allErrors.length,
                  errors: allErrors,
                  startTime: Date.now(),
                },
                status: UserRequestUploadStatus.FAILED,
                progress: 0,
                completedAt: new Date(),
                uploadType: UploadType.COMPANY_BULK_UPLOAD,
              },
              { upsert: true }
            );
            await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
              publicId,
              userId: adminTIN,
              requestId,
              status: "error",
              message: `Branch upload failed: ${allErrors.length} errors.`,
              errors: allErrors,
            });
            channel.ack(msg);
          };

          try {
            // Init progress
            await UploadProgress.findOneAndUpdate(
              { userId: adminTIN, requestId },
              {
                message: {
                  totalBranches: 0,
                  processed: 0,
                  successful: 0,
                  failed: 0,
                  errors: [],
                  startTime: Date.now(),
                },
                status: UserRequestUploadStatus.IN_PROGRESS,
                progress: 0,
                uploadType: UploadType.COMPANY_BULK_UPLOAD,
              },
              { upsert: true }
            );

            // Download & Parse CSV
            const rawCsvData = (
              await axios.get(csvUrl, { responseType: "text" })
            ).data;
            if (Buffer.byteLength(rawCsvData, "utf8") > MAX_FILE_SIZE)
              return failUpload([
                {
                  message: "File size exceeds 10MB limit",
                  requestId,
                  adminTIN,
                  row: 0,
                },
              ]);
            let records = await parseCSVStream(rawCsvData);
            if (records.length === 0)
              return failUpload([
                { message: "Empty CSV", requestId, adminTIN, row: 0 },
              ]);
            if (records.length > MAX_ROWS)
              return failUpload([
                {
                  message: `Row count exceeds ${MAX_ROWS} limit`,
                  requestId,
                  adminTIN,
                  row: 0,
                },
              ]);

            // Update total
            await redisClient.setex(
              progressKey,
              SECONDS_IN_7_DAYS,
              JSON.stringify({
                ...(await getCompanyBulkDataProgress(progressKey)),
                totalBranches: records.length,
              })
            );
            await updateUploadProgress(
              progressKey,
              "success",
              adminTIN,
              undefined,
              requestId
            );

            // Validate headers against template
            const expectedHeaders = getBranchTemplate(institutionType);
            const headers = Object.keys(records[0] || {});
            const missingHeaders = expectedHeaders.filter(
              (h) => !headers.includes(h)
            );
            if (missingHeaders.length > 0)
              return failUpload([
                {
                  message: `Missing headers: ${missingHeaders.join(", ")}`,
                  requestId,
                  adminTIN,
                  row: 0,
                },
              ]);

            // Validate all rows
            const branchRecords: ICompanyData[] = [];
            const validationErrors: IError[] = [];
            for (let i = 0; i < records.length; i += CHUNK_SIZE) {
              const batch = records.slice(i, i + CHUNK_SIZE);
              await Promise.all(
                batch.map(async (row, idx) => {
                  const rowNum = i + idx + 1;
                  const valResult = validateBranchRowData(
                    row,
                    rowNum,
                    institutionType
                  );
                  if (valResult.errors) {
                    valResult.errors.forEach((err) =>
                      validationErrors.push({
                        message: err.message,
                        requestId,
                        adminTIN,
                        row: rowNum,
                      })
                    );
                    return;
                  }

                  const cacResult = await veriFyCAC(
                    row["CAC_(RC/BN)_Number"],
                    rowNum
                  );
                  if (!cacResult.isValid) {
                    validationErrors.push({
                      message: `CAC verification failed: ${
                        cacResult.error || "Invalid CAC"
                      }`,
                      requestId,
                      adminTIN,
                      row: rowNum,
                    });
                    return;
                  }

                  const tin = await getSingleTINFromPool("COMPANY", 4);
                  const genPassword = generateUniquePassword();
                  const hashedPassword = await bcrypt.hash(
                    genPassword,
                    await bcrypt.genSalt(10)
                  );

                  let branchData: ICompanyData = {
                    userType: UserType.COMPANY,
                    tin,
                    passwordHash: hashedPassword,
                    plaintextPassword: genPassword,
                    companyName: cacResult.companyName!,
                    cacNumber: cacResult.cac!,
                    businessSector: row["Bus_Sector"],
                    companyType: cacResult.companyType!,
                    registrationDate: new Date(cacResult?.companyDate!),
                    companyEmail: row["company_email"],
                    email: row["Email_Address"],
                    phone: normalizePhoneNumber(row["Telephone_No"]),
                    secondaryPhone: row["secondary_phone"]
                      ? normalizePhoneNumber(row["secondary_phone"])
                      : undefined,
                    address: row["Operating Address"],
                    lgaOfOperation: row["LGA of Operations"],
                    state: row["state_of_residence"],
                    city: row["city"],
                    institutionType,
                    operationalZone:
                      getOperationalZone(row["LGA of Operations"]) || "Zone 1",
                    rowCount:rowNum,
                  };

                  if (institutionType === InstitutionType.HOSPITAL) {
                    Object.assign(branchData, {
                      operationalName: row.OPERATIONAL_NAME,
                      branchLocation: row.BRANCH_LOCATION,
                      numberOfBeds: row.NUMBER_OF_BEDS,
                      operateMortuary: row.OPERATE_MORTUARY === "true",
                      runLaboratory: row.RUN_LABORATORY === "true",
                      hospitalIsBranchOffice: row.BRANCH_LOCATION
                        ? true
                        : false,
                      hospitalBranchLocation: row.BRANCH_LOCATION,
                    });
                  } else if (institutionType === InstitutionType.BANK) {
                    Object.assign(branchData, {
                      bankOperationalName: row.OPERATIONAL_NAME,
                      bankIsBranchOffice: row.BRANCH_LOCATION ? true : false,
                      bankBranchLocation: row.BRANCH_LOCATION,
                    });
                  } else if (institutionType === InstitutionType.OIL_GAS) {
                    Object.assign(branchData, {
                      oilGasOperationalName: row.OPERATIONAL_NAME,
                      oilGasIsBranchOffice: row.BRANCH_LOCATION ? true : false,
                      oilGasBranchLocation: row.BRANCH_LOCATION,
                    });
                  } else if (
                    institutionType === InstitutionType.PETROL_STATION
                  ) {
                    Object.assign(branchData, {
                      petroOperationalName: row.OPERATIONAL_NAME,
                      petroIsBranchOffice: row.BRANCH_LOCATION ? true : false,
                      petroBranchLocation: row.BRANCH_LOCATION,
                      numberOfPumps: row.NUMBER_OF_PUMPS,
                    });
                  }
                  branchRecords.push(branchData);
                })
              );
              await updateUploadProgress(
                progressKey,
                validationErrors.length > 0 ? "failure" : "success",
                adminTIN,
                validationErrors.length > 0 ? "Validation errors" : undefined,
                requestId
              );
            }

            // logger.info("Pre-insertion branchRecords", { branchRecords });

            if (validationErrors.length > 0)
              return failUpload(validationErrors);

            // Duplicate check
            await UploadProgress.findOneAndUpdate(
              { userId: adminTIN, requestId },
              {
                status: UserRequestUploadStatus.VALIDATING,
                progress: 50,
                uploadType: UploadType.COMPANY_BULK_UPLOAD,
              }
            );
            const duplicates = await limiter.schedule(() =>
              verifyDuplicatesInBatch(
                branchRecords.map((b) => ({
                  tin: b.tin,
                  email: b.email,
                  rowCount: b.rowCount!,
                }))
              )
            );
            const dupErrors = duplicates
              .filter((d) => !d.isValid)
              .map((d) => ({
                message: `Duplicate ${d.duplicateField} found at row ${d.rowCount}. Please make changes to this`,
                requestId,
                adminTIN,
                row: d.rowCount,
              }));
            if (dupErrors.length > 0) return failUpload(dupErrors);

            await updateUploadProgress(
              progressKey,
              "success",
              adminTIN,
              undefined,
              requestId
            );

            // Insert
            let inserted = [];
            for (let i = 0; i < branchRecords.length; i += CHUNK_SIZE) {
              const chunk = branchRecords.slice(i, i + CHUNK_SIZE);
              logger.info("Attempting to insert chunk", {
                chunkSize: chunk.length,
                startIndex: i,
              });
              try {
                const result = await User.insertMany(chunk, { ordered: false });
                inserted.push(...result);
                logger.info("Chunk inserted successfully", {
                  insertedCount: result.length,
                });
                await updateUploadProgress(
                  progressKey,
                  "success",
                  adminTIN,
                  undefined,
                  requestId
                );
              } catch (error: any) {
                const errorMessage =
                  error.code === 11000
                    ? `Duplicate key error: ${
                        error.message.match(/dup key: { (.+?) }/)?.[1] ||
                        error.message
                      }`
                    : error.message;
                logger.error("Failed to insert User", {
                  error: error.message,
                  stack: error.stack,
                  chunk,
                });
                const insertionErrors: IError[] = chunk.map((t) => ({
                  message: errorMessage,
                  requestId,
                  adminTIN,
                  row: t.rowCount,
                }));
                return failUpload(insertionErrors);
              }
            }

            for (const taxpayer of inserted) {
              await redisClient.setex(
                `user:${taxpayer.tin}`,
                SECONDS_IN_1_DAY,
                JSON.stringify(taxpayer)
              );
            }

            // Process notifications for successfully inserted taxpayers
            if (inserted.length > 0) {
              logger.info("Processing notifications for inserted taxpayers", {
                count: inserted.length,
              });

              for (const insertedTaxpayer of inserted) {
                const fullName =
                  `${insertedTaxpayer.firstName} ${insertedTaxpayer.lastName}`.trim();
                const profileLink = `${
                  process.env.WEB_ORIGIN ||
                  process.env.WEB_ORIGIN2 ||
                  process.env.WEB_ORIGIN3
                }/auth/signin`;

                // Queue email notification
                try {
                  const emailData = {
                    email: insertedTaxpayer.email,
                    name: fullName,
                    accountType: "individual",
                    tin: insertedTaxpayer.tin,
                    password: insertedTaxpayer.plaintextPassword,
                    profileLink,
                    unsubscribeLink: profileLink,
                    notificationId: v4(),
                  };
                  await sendUserMessage(BULK_TAXPAYER_EMAIL_TOPIC, emailData);
                  logger.info("Queued email notification", {
                    email: insertedTaxpayer.email,
                    tin: insertedTaxpayer.tin,
                  });
                } catch (emailError) {
                  logger.error("Failed to queue email notification", {
                    tin: insertedTaxpayer.tin,
                    error: emailError,
                  });
                }

                // Queue SMS notification
                // try {
                //   const smsData = {
                //     phone: insertedTaxpayer.phone,
                //     message: `Hi ${fullName}, Welcome to AKIRS! Your credentials: Taxpayer ID: ${
                //       insertedTaxpayer.tin
                //     }, Password: ${insertedTaxpayer.plaintextPassword}. Visit ${
                //       process.env.WEB_ORIGIN ||
                //       process.env.WEB_ORIGIN2 ||
                //       process.env.WEB_ORIGIN3
                //     }/auth/signin to get started.`,
                //   };
                //   await sendUserMessage(BULK_TAXPAYER_SMS_TOPIC, smsData);
                //   logger.info("Queued SMS notification", {
                //     phone: insertedTaxpayer.phone,
                //     tin: insertedTaxpayer.tin,
                //   });
                // } catch (smsError) {
                //   logger.error("Failed to queue SMS notification", {
                //     tin: insertedTaxpayer.tin,
                //     error: smsError,
                //   });
                // }
              }
            }

            // send notifications
            try {
              const userRedisPattern = `redis:user:${adminTIN}:*`;
              const userRedisKeys = await redisClient.keys(userRedisPattern);

              // user:chart:
              const userChartRedisPattern = `user:chart:${adminTIN}:*`;
              const userChartRedisKeys = await redisClient.keys(
                userRedisPattern
              );
              if (userRedisKeys.length > 0 || userChartRedisKeys.length > 0) {
                await redisClient.del(userRedisKeys);
                await redisClient.del(userChartRedisKeys);
              }
            } catch (cacheError) {
              logger.warn("Failed to clear user cache", { error: cacheError });
            }
            // Finalize
            await updateUploadProgress(
              progressKey,
              "success",
              adminTIN,
              undefined,
              requestId
            );
            await UploadProgress.findOneAndUpdate(
              { userId: adminTIN, requestId },
              {
                status: UserRequestUploadStatus.COMPLETED,
                progress: 100,
                completedAt: new Date(),
                message: {
                  totalBranches: branchRecords.length,
                  processed: inserted.length,
                  successful: inserted.length,
                  failed: 0,
                  errors: [],
                  startTime: Date.now(),
                },
                uploadType: UploadType.COMPANY_BULK_UPLOAD,
              }
            );
            logger.info("Bulk company processing completed successfully", {
              publicId,
              insertedCount: inserted.length,
            });
            channel.ack(msg);
          } catch (err: any) {
            await failUpload([
              { message: err.message, requestId, adminTIN, row: 0 },
            ]);
          }
        } catch (err: any) {
          logger.error("Consumer failed", {
            error: err.message,
            stack: err.stack,
          });
          // await failUpload([{ message: err.message, requestId, adminTIN, row: 0 }]);
        }
      },
      { noAck: false }
    );
  } catch (err) {
    logger.error("Worker start failed", err);
  }
};
