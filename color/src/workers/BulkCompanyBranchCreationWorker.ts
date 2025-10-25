import logger from "../utils/logger";
import {
  BULK_COMPANY_BRANCH_UPLOAD_TOPIC,
  BULK_TAXPAYER_RESULT_TOPIC,
  CHUNK_SIZE,
  MAX_FILE_SIZE,
  MAX_ROWS,
  QUEUES,
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

// Interfaces
interface IError {
  message: string;
  requestId: string;
  employerTin: string;
  row?: number;
}

export interface IProgressTracker {
  totalBranches: number;
  processed: number;
  successful: number;
  failed: number;
  errors: IError[];
  startTime: number;
}

interface IBranchData {
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
  phone: string;
  secondaryPhone?: string;
  address: string;
  currentAddress?: string;
  lga: string;
  state: string;
  city: string;
  proofOfResidency: string;
  institutionType: InstitutionType;
  branchType: BranchType.BRANCH;
  parentCompanyTin: string;
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
  rowCount: number;
}
/**
 * Get progress from Redis
 */
export async function getProgress(
  progressKey: string
): Promise<IProgressTracker> {
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
          employerTin: employerTin,
          requestId,
          row,
        });
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
      uploadType: UploadType.COMPANY_BRANCH_BULK_UPLOAD,
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
      // Only update MongoDB if not final state (avoid race conditions)
      progressData.processed < progressData.totalBranches ||
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
      employerTin,
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

/**
 * Worker
 */
export const BulkCompanyBranchCreationWorker = async (
  rabbitChannel: amqp.Channel
) => {
  const channel = rabbitChannel;
  const limiter = new Bottleneck({ maxConcurrent: 10, minTime: 100 });

  try {
    await channel.assertExchange(USER_EXCHANGE, "topic", { durable: true });
    await channel.assertQueue(QUEUES[BULK_COMPANY_BRANCH_UPLOAD_TOPIC], {
      durable: true,
    });
    await channel.bindQueue(
      QUEUES[BULK_COMPANY_BRANCH_UPLOAD_TOPIC],
      USER_EXCHANGE,
      BULK_COMPANY_BRANCH_UPLOAD_TOPIC
    );

    logger.info(`Consuming ${QUEUES[BULK_COMPANY_BRANCH_UPLOAD_TOPIC]}`);

    await channel.consume(
      QUEUES[BULK_COMPANY_BRANCH_UPLOAD_TOPIC],
      async (msg) => {
        if (!msg) return;
        const { requestId, csvUrl, publicId, employerTin, institutionType } =
          JSON.parse(msg.content.toString());
        const progressKey = `bulk_company_branch_upload:${publicId}:${employerTin}`;
        let errors: IError[] = [];

        const failUpload = async (allErrors: IError[]) => {
          await UploadProgress.findOneAndUpdate(
            { userId: employerTin, requestId },
            {
              uploadType: UploadType.COMPANY_BRANCH_BULK_UPLOAD,
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
            },
            { upsert: true }
          );
          await sendUserMessage(BULK_TAXPAYER_RESULT_TOPIC, {
            publicId,
            userId: employerTin,
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
            { userId: employerTin, requestId },
            {
              uploadType: UploadType.COMPANY_BRANCH_BULK_UPLOAD,
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
            },
            { upsert: true }
          );

          // Download & Parse CSV
          const rawCsvData = (await axios.get(csvUrl, { responseType: "text" }))
            .data;
          if (Buffer.byteLength(rawCsvData, "utf8") > MAX_FILE_SIZE)
            return failUpload([
              {
                message: "File too large",
                requestId,
                employerTin: employerTin,
                row: 0,
              },
            ]);
          let records = await parseCSVStream(rawCsvData);
          if (records.length === 0)
            return failUpload([
              {
                message: "Empty CSV",
                requestId,
                employerTin: employerTin,
                row: 0,
              },
            ]);
          if (records.length > MAX_ROWS)
            return failUpload([
              {
                message: `Too many rows (${records.length})`,
                requestId,
                employerTin: employerTin,
                row: 0,
              },
            ]);

          // Update total
          await redisClient.setex(
            progressKey,
            SECONDS_IN_7_DAYS,
            JSON.stringify({
              ...(await getProgress(progressKey)),
              totalBranches: records.length,
            })
          );

          // Validate headers against template
          const expectedHeaders = getBranchTemplate(institutionType);
          const headers = Object.keys(records[0]);
          const missingHeaders = expectedHeaders.filter(
            (h) => !headers.includes(h)
          );
          if (missingHeaders.length > 0)
            return failUpload([
              {
                message: `Missing headers: ${missingHeaders.join(", ")}`,
                requestId,
                employerTin: employerTin,
                row: 0,
              },
            ]);
          // Validate all rows
          const branchRecords: IBranchData[] = [];
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
                      employerTin: employerTin,
                      row: rowNum,
                    })
                  );
                  return;
                }

                // Fetch parent
                const parentTin = row.PARENT_COMPANY_TIN;
                const parent = await User.findOne({ tin: parentTin });
                if (
                  !parent ||
                  parent.userType !== UserType.COMPANY ||
                  parent.branchType !== BranchType.HEAD_OFFICE
                ) {
                  validationErrors.push({
                    message: `Invalid parent TIN ${parentTin}`,
                    requestId,
                    employerTin: employerTin,
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
                let branchData: IBranchData = {
                  userType: UserType.COMPANY,
                  tin,
                  passwordHash: hashedPassword,
                  plaintextPassword: genPassword,
                  companyName: parent.companyName!,
                  cacNumber: parent.cacNumber!,
                  companyType: parent.companyType!,
                  registrationDate: parent.registrationDate!,
                  companyEmail: row.COMPANY_EMAIL || parent.companyEmail!,
                  email: row.EMAIL,
                  phone: normalizePhoneNumber(row.PHONE),
                  secondaryPhone: row.SECONDARY_PHONE
                    ? normalizePhoneNumber(row.SECONDARY_PHONE)
                    : undefined,
                  address: row.ADDRESS || parent.address!,
                  currentAddress: row.CURRENT_ADDRESS,
                  lga: row.LGA,
                  state: row.STATE_OF_RESIDENCE,
                  city: row.CITY,
                  proofOfResidency: row.PROOF_OF_RESIDENCY,
                  institutionType: institutionType as InstitutionType,
                  branchType: BranchType.BRANCH,
                  parentCompanyTin: parentTin,
                  rowCount: rowNum,
                };
                if (institutionType === InstitutionType.HOSPITAL) {
                  Object.assign(branchData, {
                    operationalName: row.OPERATIONAL_NAME,
                    branchLocation: row.BRANCH_LOCATION,
                    numberOfBeds: row.NUMBER_OF_BEDS,
                    operateMortuary: row.OPERATE_MORTUARY === "true",
                    runLaboratory: row.RUN_LABORATORY === "true",
                  });
                }

                if (institutionType === InstitutionType.BANK) {
                  Object.assign(branchData, {
                    bankOperationalName: row.OPERATIONAL_NAME,
                    bankIsBranchOffice: true,
                    bankBranchLocation: row.BRANCH_LOCATION,
                  });
                }

                if (institutionType === InstitutionType.OIL_GAS) {
                  Object.assign(branchData, {
                    oilGasOperationalName: row.OPERATIONAL_NAME,
                    oilGasIsBranchOffice: true,
                    oilGasBranchLocation: row.BRANCH_LOCATION,
                  });
                }

                if (institutionType === InstitutionType.PETROL_STATION) {
                  Object.assign(branchData, {
                    petroOperationalName: row.OPERATIONAL_NAME,
                    petroIsBranchOffice: true,
                    petroBranchLocation: row.BRANCH_LOCATION,
                    numberOfPumps: row.NUMBER_OF_PUMPS,
                  });
                }

                // For 'others' or default, assign common branch fields
                if (
                  !Object.values(InstitutionType).includes(
                    institutionType as InstitutionType
                  )
                ) {
                  Object.assign(branchData, {
                    operationalName: row.OPERATIONAL_NAME,
                    branchLocation: row.BRANCH_LOCATION,
                  });
                }

                branchRecords.push(branchData);
                branchRecords.push(branchData);
              })
            );

            // Progress
            const progress = ((i + batch.length) / records.length) * 100;
            await updateUploadProgress(
              progressKey,
              "success",
              employerTin,
              undefined,
              requestId
            );
          }

          if (validationErrors.length > 0) return failUpload(validationErrors);

          // Duplicate check (emails/TINs)
          const duplicates = await limiter.schedule(() =>
            verifyDuplicatesInBatch(
              branchRecords.map((b) => ({
                tin: b.tin,
                email: b.email,
                rowCount: b.rowCount,
              }))
            )
          );
          const dupErrors = duplicates
            .filter((d) => !d.isValid)
            .map((d) => ({
              message: `Duplicate ${d.duplicateField} found at row ${d.rowCount}. Please kindly correct the duplicate field`,
              requestId,
              employerTin: employerTin,
              row: d.rowCount,
            }));
          if (dupErrors.length > 0) return failUpload(dupErrors);

          // Insert
          let inserted = [];
          for (let i = 0; i < branchRecords.length; i += CHUNK_SIZE) {
            const chunk = branchRecords.slice(i, i + CHUNK_SIZE);
            const result = await User.insertMany(chunk, { ordered: false });
            inserted.push(...result);
            await updateUploadProgress(
              progressKey,
              "success",
              employerTin,
              undefined,
              requestId
            );
          }

          // Notifications & Completion (similar to your code)
          // ... (add notification queuing here, inherit logic)


          await UploadProgress.findOneAndUpdate(
            { userId: employerTin, requestId },
            {
              uploadType: UploadType.COMPANY_BRANCH_BULK_UPLOAD,
              status: UserRequestUploadStatus.COMPLETED,
              progress: 100,
              completedAt: new Date(),
            }
          );

          channel.ack(msg);
        } catch (err: any) {
          await failUpload([
            { message: err.message, requestId, employerTin: employerTin },
          ]);
        }
      },
      { noAck: false }
    );
  } catch (err) {
    logger.error("Worker start failed", err);
  }
};
