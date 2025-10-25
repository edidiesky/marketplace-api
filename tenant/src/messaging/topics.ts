import logger from "../utils/logger";
import User, { IUser } from "../models/User";
import redisClient from "../config/redis";
import { sendUserMessage } from "./producer";
import { normalizePhoneNumber } from "../utils/normalizePhoneNumber";
import {
  AUTH_DLQ_TOPIC,
  BULK_TAXPAYER_RESULT_TOPIC,
  BULK_TAXPAYER_TOPIC,
  CHUNK_SIZE,
  NIN_VERIFICATION_RESULT_TOPIC,
  TCC_COMPLIANCE_PROFILE_REQUEST_TOPIC,
  TCC_REQUEST_EMPLOYEE_TIN_VALIDATION_TOPIC,
  TCC_REQUEST_TIN_VALIDATION_TOPIC,
  TIN_VALIDATION_TOPIC,
  USER_CREATION_COMPLETED_TOPIC,
  USER_CREATION_FAILED_TOPIC,
  USER_CREATION_TOPIC,
} from "../constants";
import UploadProgress from "../models/UploadProgress";
import { FailedMessage } from "../models/FailedMessage";

interface TinValidationResult {
  isFound: boolean;
  email?: string;
  phone?: string;
  address?: string;
  name?: string;
  image?: string;
  occupation?: string;
  employerName?: string;
  companyName?: string;
  cacNumber?: string;
  error?: string;
  employmentStatus?: string;
}

const BATCH_SIZE = 1000;
const redisKey = "user.created.batch";
const BULK_TAXPAYER_REDIS_KEY = "bulk_taxpayer.created.batch";

export const userTopics = {
  [USER_CREATION_TOPIC]: async (data: any) => {
    logger.info("Processing user creation queue");
    try {
      const users = Array.isArray(data) ? data : [data];
      for (const user of users) {
        const requiredFields = ["tin", "email", "passwordHash", "userType"];
        for (const field of requiredFields) {
          if (!user[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }
        await redisClient.lpush(redisKey, JSON.stringify(user));
        logger.info("Added user to Redis queue", {
          email: user.email,
          tin: user.tin,
        });
      }
    } catch (error: any) {
      logger.error("Error processing user creation message", { error });
      if (data.requestId) {
        await sendUserMessage(USER_CREATION_FAILED_TOPIC, {
          requestId: data.requestId,
          tin: data.tin,
          email: data.email,
          error: error.message,
        });
      }
      throw error;
    }
  },
  [USER_CREATION_COMPLETED_TOPIC]: async (data: any) => {
    logger.info("Processing user creation completed", { data });
    try {
      const { requestId, tin, email } = data;
      const user = await User.findOne({ tin });
      if (!user) {
        throw new Error(`User not found for TIN: ${tin}`);
      }
      // Store result for RegisterUser to pick up
      await redisClient.setex(
        `saga:result:${requestId}`,
        60,
        JSON.stringify({ user })
      );
    } catch (error: any) {
      logger.error("Error processing user creation completed", { error });
      throw error;
    }
  },
  [USER_CREATION_FAILED_TOPIC]: async (data: any) => {
    logger.error("Processing user creation failed", { data });
    try {
      const { requestId, tin, email, error } = data;
      // Store failure result
      await redisClient.setex(
        `saga:result:${requestId}`,
        60,
        JSON.stringify({ error })
      );
      // Compensating action: release TIN back to pool (implement getSingleTINFromPool inverse)
      // await releaseTINToPool(tin);
    } catch (error: any) {
      logger.error("Error processing user creation failed", { error });
      throw error;
    }
  },
  [TIN_VALIDATION_TOPIC]: async (data: any) => {
    const { tins, tin, userType, requestId, employerTin } = data;
    const responseKey = `tin:validation:response:${requestId}`;

    try {
      logger.info("Processing TIN validation request", {
        requestId,
        tins,
        tin,
        userType,
        employerTin,
      });

      if (tins && Array.isArray(tins)) {
        const results: {
          [key: string]: {
            isFound: boolean;
            email?: string;
            phone?: string;
            address?: string;
            profileImage?: string;
            name: string;
            employerName?: string;
            companyName?: string;
            cacNumber?: string;
          };
        } = {};
        for (const t of tins) {
          logger.debug("Querying MongoDB for TIN", { tin: t, userType });
          const user = await User.findOne({
            tin: t,
            // employmentStatus: "EMPLOYED",
            // employerTin,
          }).select(
            "tin email firstName employerName lastName secondaryPhone address profileImage occupation companyName"
          );
          logger.info("user:", {
            user,
          });
          results[t] = {
            isFound: !!user,
            email: user?.email,
            name: `${user?.firstName} ${user?.lastName}`,
            address: user?.address,
            profileImage: user?.profileImage,
            employerName: user?.employerName,
            companyName: user?.companyName,
            cacNumber: user?.cacNumber,
            phone: user?.secondaryPhone,
          };
          logger.debug("TIN validation result", {
            tin: t,
            userType,
            isFound: !!user,
            email: user?.email,
            phone: user?.phone,
          });
        }
        logger.debug("Writing batch validation results to Redis", {
          responseKey,
          results,
        });
        await redisClient.setex(responseKey, 60, JSON.stringify({ results }));
        logger.info("Batch TIN validation completed", { requestId, results });
      } else if (tin) {
        logger.debug("Querying MongoDB for single TIN", { tin, userType });
        const user = await User.findOne({ tin, userType }).select(
          "tin email phone address profileImage"
        );
        const result = {
          isFound: !!user,
          email: user?.email,
          name: `${user?.firstName} ${user?.lastName}`,
          address: user?.address, //profileImage
          profileImage: user?.profileImage, //profileImage
          phone: user?.secondaryPhone,
        };
        logger.debug("Writing single validation result to Redis", {
          responseKey,
          result,
        });
        await redisClient.setex(responseKey, 60, JSON.stringify(result));
        logger.info("Single TIN validation completed", {
          requestId,
          tin,
          result,
        });
      }
    } catch (error: any) {
      logger.error("Error processing TIN validation request", {
        requestId,
        tins,
        tin,
        userType,
        error: error.message,
        stack: error.stack,
      });
      await redisClient.setex(
        responseKey,
        60,
        JSON.stringify({ error: error.message })
      );
    }
  },
  [TCC_REQUEST_TIN_VALIDATION_TOPIC]: async (data: any) => {
    const { tins, tin, userType, requestId } = data;
    const responseKey = `tin:validation:response:${requestId}`;

    try {
      logger.info("Processing TIN validation request", {
        requestId,
        tins,
        tin,
        userType,
      });

      if (tins && Array.isArray(tins)) {
        const results: {
          [key: string]: {
            isFound: boolean;
            email?: string;
            phone?: string;
            address?: string;
            profileImage?: string;
            name: string;
          };
        } = {};
        for (const t of tins) {
          logger.debug("Querying MongoDB for TIN", { tin: t, userType });
          const user = await User.findOne({ tin: t }).select(
            "tin email firstName lastName secondaryPhone address profileImage"
          );
          // logger.info("user:", {
          //   user,
          // });
          results[t] = {
            isFound: !!user,
            email: user?.email,
            name: `${user?.firstName} ${user?.lastName}`,
            address: user?.address,
            profileImage: user?.profileImage, //profileImage
            phone: user?.secondaryPhone,
          };
          logger.debug("TIN validation result", {
            tin: t,
            userType,
            isFound: !!user,
            email: user?.email,
            phone: user?.phone,
          });
        }
        logger.debug("Writing batch validation results to Redis", {
          responseKey,
          results,
        });
        await redisClient.setex(responseKey, 60, JSON.stringify({ results }));
        logger.info("Batch TIN validation completed", { requestId, results });
      } else if (tin) {
        logger.debug("Querying MongoDB for single TIN", { tin, userType });
        const user = await User.findOne({ tin, userType }).select(
          "tin email phone address profileImage"
        );
        const result = {
          isFound: !!user,
          email: user?.email,
          name: `${user?.firstName} ${user?.lastName}`,
          address: user?.address,
          profileImage: user?.profileImage,
          phone: user?.secondaryPhone,
        };
        logger.debug("Writing single validation result to Redis", {
          responseKey,
          result,
        });
        await redisClient.setex(responseKey, 60, JSON.stringify(result));
        logger.info("Single TIN validation completed", {
          requestId,
          tin,
          result,
        });
      }
    } catch (error: any) {
      logger.error("Error processing TIN validation request", {
        requestId,
        tins,
        tin,
        userType,
        error: error.message,
        stack: error.stack,
      });
      await redisClient.setex(
        responseKey,
        60,
        JSON.stringify({ error: error.message })
      );
    }
  },
  [TCC_COMPLIANCE_PROFILE_REQUEST_TOPIC]: async (data: any) => {
    const { requestId, tin } = data;
    const responseKey = `tcc:compliance:${requestId}:${tin}:taxpayer`;
    try {
      logger.info("Processing TCC compliance validation request", {
        requestId,
        tin,
      });

      const user = await User.findOne({ tin }).select(
        "tin email firstName employerName userType employmentStatus lastName secondaryPhone address profileImage position"
      );
      const result = {
        isFound: !!user,
        email: user?.email,
        tin: user?.tin,
        userType: user?.userType, // userType
        employerName: user?.employerName, //employerName
        occupation: user?.position, //employerName
        employmentStatus: user?.employmentStatus,
        name:
          user?.userType === "COMPANY"
            ? `${user?.companyName}`
            : `${user?.firstName} ${user?.lastName}`,
        address: user?.address,
        profileImage: user?.profileImage, //profileImage
        phone: user?.secondaryPhone!.startsWith("+")
          ? user?.secondaryPhone
          : normalizePhoneNumber(user?.secondaryPhone!),
      };

      const setResult = await redisClient.set(
        responseKey,
        JSON.stringify(result),
        "EX",
        3600
      );
      if (setResult !== "OK") {
        logger.error("Redis setex operation failed");
      }
      logger.info("Single  UserTCC Profile Request completed", {
        requestId,
        tin,
        result,
        user,
      });
    } catch (error: any) {
      logger.error("Error processing Single TCC Profile request", {
        requestId,
        tin,
        error: error.message,
        stack: error.stack,
      });
      await redisClient.setex(
        responseKey,
        60,
        JSON.stringify({ error: error.message })
      );
    }
  },
  [NIN_VERIFICATION_RESULT_TOPIC]: async (data: any) => {
    const { publicId, results, taxpayerRecords } = data;
    logger.info("Processing NIN verification results", {
      publicId,
      results: results?.length,
      taxpayerRecords: taxpayerRecords?.length,
    });

    const invalidNINs = results.filter((result: any) => !result.isValid);
    if (invalidNINs.length > 0) {
      logger.warn("Invalid NINs detected", { invalidNINs });
      // Store error in Redis for handler to pick up
      await redisClient.setex(
        `bulk_taxpayer_response:${publicId}`,
        60,
        JSON.stringify({
          status: "error",
          message: `NIN verification failed for the following records: TINs [${invalidNINs
            .map((record: { nin: number }) => record.nin)
            .join(", ")}] at rows [${invalidNINs
            .map((record: { rowCount: number }) => record.rowCount)
            .join(
              ", "
            )}]. Please review the uploaded file and correct the invalid NINs before retrying.`,
          excludedRecords: invalidNINs.map((r: any) => ({
            tin: r.nin,
            email: "",
          })),
        })
      );
      return;
    }

    // Forward to BULK_TAXPAYER_TOPIC with updated records
    const chunks = [];
    for (let i = 0; i < results.length; i += CHUNK_SIZE) {
      chunks.push(results.slice(i, i + CHUNK_SIZE));
    }

    // logger.info("chunks:");
    for (const chunk of chunks) {
      await sendUserMessage(BULK_TAXPAYER_TOPIC, {
        taxpayers: chunk.map((r: any) => ({
          ...r,
          photoUrl: r.photoUrl || "",
          isValid: "",
        })),
        publicId,
        companyId: "", // Adjust based on context
      });
      logger.info("Pushed taxpayer chunk to RabbitMQ", {
        chunkSize: chunk.length,
        publicId,
      });
    }
  },
  // TCC_REQUEST_EMPLOYEE_TIN_VALIDATION_TOPIC
  [TCC_REQUEST_EMPLOYEE_TIN_VALIDATION_TOPIC]: async (data: any) => {
    const { tins, tin, userType, requestId, employerTin } = data;
    const responseKey = `tin:validation:response:${requestId}`;
    try {
      logger.info("Processing Employee TIN validation request", { ...data });

      const results: {
        [key: string]: TinValidationResult & { error?: string };
      } = {};

      if (tins && Array.isArray(tins)) {
        // Batch validation using $in for performance
        const tinList = tins.filter((t) => t && t.trim().length > 0);
        if (tinList.length === 0) {
          throw new Error("No valid TINs provided for validation");
        }

        const users = await User.find({
          tin: { $in: tinList },
          // employerTin,
          // employmentStatus: "EMPLOYED",
        }).select(
          "tin email firstName employerTin occupation employmentStatus employerName lastName secondaryPhone address profileImage"
        );
        logger.debug("Fetched users from MongoDB", {
          users: users.map((u) => u.toObject()),
        });

        // Populate userMap with tin as key
        const userMap = new Map(
          users.map((user) => [user.tin.toString(), user.toObject()])
        ); // Convert to plain object to ensure tin is accessible
        logger.info("User validation results:", {
          users: users.map((u) => u.toObject()),
          userMap: Object.fromEntries(userMap),
        });
        for (const t of tinList) {
          const user = userMap.get(t) as Partial<IUser>;
          if (!user) {
            results[t] = {
              isFound: false,
              error: "TIN not found or not associated with this employer",
            };
          } else if (user.employerTin !== employerTin) {
            results[t] = {
              isFound: false,
              error: "TIN does not belong to a staff member of this company",
            };
          } else if (user.employmentStatus !== "EMPLOYED") {
            results[t] = {
              isFound: false,
              error: "TIN is not currently employed",
            };
          } else {
            results[t] = {
              isFound: true,
              email: user.email,
              name: `${user.firstName} ${user.lastName || ""}`.trim(),
              address: user.address,
              image: user.profileImage,
              phone: user.secondaryPhone,
              occupation: user.occupation,
              employerName: user.employerName,
              employmentStatus: user.employmentStatus,
            };
          }
          logger.debug("TIN validation result", {
            tin: t,
            userType,
            isFound: results[t].isFound,
            error: results[t].error,
            email: user?.email,
            phone: user?.secondaryPhone,
          });
        }

        logger.debug("Writing batch validation results to Redis", {
          responseKey,
          results,
        });
        await redisClient.setex(responseKey, 60, JSON.stringify({ results }));
        logger.info("Batch Employee TIN validation completed", {
          requestId,
          results,
        });
      } else if (tin) {
        logger.debug("Querying MongoDB for single TIN", { tin, userType });
        const user = await User.findOne({
          tin,
          employerTin,
          employmentStatus: "EMPLOYED",
        }).select(
          "tin email firstName lastName secondaryPhone address profileImage"
        );

        if (!user) {
          results[tin] = {
            isFound: false,
            error: "TIN not found or not associated with this employer",
          };
        } else if (user.employerTin !== employerTin) {
          results[tin] = {
            isFound: false,
            error: "TIN does not belong to a staff member of this company",
          };
        } else if (user.employmentStatus !== "EMPLOYED") {
          results[tin] = {
            isFound: false,
            error: "TIN is not currently employed",
          };
        } else {
          results[tin] = {
            isFound: true,
            email: user.email,
            name: `${user.firstName} ${user.lastName || ""}`.trim(),
            address: user.address,
            image: user.profileImage,
            phone: user.secondaryPhone,
          };
        }

        logger.debug("Writing single validation result to Redis", {
          responseKey,
          results,
        });
        await redisClient.setex(responseKey, 60, JSON.stringify(results[tin]));
        logger.info("Single Employee TIN validation completed", {
          requestId,
          tin,
          results: results[tin],
        });
      }
    } catch (error: any) {
      logger.error("Error processing Employee TIN validation request", {
        requestId,
        tins,
        tin,
        userType,
        error: error.message,
        stack: error.stack,
      });
      await redisClient.setex(
        responseKey,
        60,
        JSON.stringify({ error: error.message })
      );
    }
  },

  [BULK_TAXPAYER_RESULT_TOPIC]: async (data: any) => {
    const { publicId, userId, status, requestId, progress, errors, message } = data;
    logger.info("TCC Request Upload data:", { ...data });

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const update = await UploadProgress.findOneAndUpdate(
          { userId, requestId }, // Matches employerTin and requestId
          {
            message: { ...data, errors }, // Include errors from the message
            status,
            progress,
            updatedAt: new Date(),
          },
          { new: true, upsert: true }
        );

        if (!update) {
          logger.error("Unexpected null result from findOneAndUpdate with upsert", { data });
          throw new Error("Failed to upsert UploadProgress document");
        }

        logger.info("Upload status updated successfully", {
          userId,
          requestId,
          progress,
          _id: update._id,
          __v: update.__v,
        });
        break; // Exit retry loop on success
      } catch (updateError: any) {
        if (
          updateError.name === "MongoServerError" &&
          (updateError.code === 11000 || updateError.code === 112) // Duplicate key or write conflict
        ) {
          logger.warn("Concurrency conflict detected, retrying...", {
            attempt,
            error: updateError.message,
            data,
          });
          if (attempt === maxRetries - 1) throw updateError;
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        } else {
          logger.error("Failed to update UploadProgress", {
            error: updateError.message,
            stack: updateError.stack,
            data,
          });
          throw updateError;
        }
      }
    }
  },
};
