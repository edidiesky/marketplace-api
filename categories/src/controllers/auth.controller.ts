import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import User, {
  ComplianceStatus,
  DirectorateType,
  InstitutionType,
  IUser,
  NationalType,
  UserType,
  VerificationStatus,
} from "../models/User";
import { v4 as uuidv4 } from "uuid";
import { generateToken, signJwt } from "../utils/generateToken";
import { getSingleTINFromPool } from "../utils/generateTIN";
import { generateUniquePassword } from "../utils/generatePassword";
import logger from "../utils/logger";
import { generateSecureToken } from "../utils/resetTokenGenerator";
import { PasswordResetToken } from "../models/ResetPassword";
import { sendUserMessage } from "../messaging/producer";
import {
  ACCOUNT_RESTRICTION,
  ACCOUNT_UNRESTRICTION,
  ADMIN_CREATION,
  ADMIN_REGISTRATION_TOPIC,
  AGENCY_REGISTRATION_TOPIC,
  BAD_REQUEST_STATUS_CODE,
  BULK_COMPANY_BRANCH_UPLOAD_TOPIC,
  BULK_COMPANY_UPLOAD_TOPIC,
  BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC,
  BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC,
  BULK_TAXPAYER_SMS_TOPIC,
  GROUP_REGISTRATION_TOPIC,
  LOGIN_2FA_TOPIC,
  NOT_FOUND_STATUS_CODE,
  REDIS_TTL,
  SECONDS_IN_7_DAYS,
  SERVER_ERROR_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
  USER_LOGIN_TOPIC,
  USER_NOTIFICATION_SUCCESS,
  USER_REGISTRATION_TOPIC,
} from "../constants";
import redisClient from "../config/redis";
import {
  measureDatabaseQuery,
  reqReplyTime,
  trackCacheHit,
  trackCacheMiss,
} from "../utils/metrics";
import { normalizePhoneNumber } from "../utils/normalizePhoneNumber";
import { uploadToCloudinary } from "../utils/uploadToCloudinary";
import mongoose from "mongoose";
import { Role, UserRole } from "../models/Role";
import TaxStation from "../models/TaxOffices";
import {
  getProgress,
  IProgressTracker,
} from "../workers/BulkIndividualTaxpayerWorker";
import UploadProgress from "../models/UploadProgress";
import { getCompanyBulkDataProgress, ICompanyBulkUploadProgressTracker } from "../workers/BulkCompanyCreationWorker";

/**
 * @description Registers a new Taxpayer.
 * @limit COMPANY AND INDIVIDUALS
 * @route POST /api/v1/auth/signup
 * @access Public
 */
const RegisterUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const {
        userType,
        email,
        phone,
        address,
        lga,
        state,
        proofOfResidency,
        secondaryPhone,
        natureOfBusiness,
        firstName,
        middleName,
        lastName,
        dateOfBirth,
        gender,
        nationality,
        maritalStatus,
        companyName,
        cacNumber,
        companyType,
        registrationDate,
        companyEmail,
        city,
        lgaOfResidence,
        uploadedFile,
        stateOfResidence,
        nin,
        businessSector,
        headOfficeAddress,
        occupation,
        currentAddress,
        employerTin,
        employmentStatus,
        institutionType,
        lgaOfOperation,
        operationalZone,
        numberOfBeds,
        operateMortuary,
        runLaboratory,
        bankOperationalName,
        bankIsBranchOffice,
        bankBranchLocation,
        oilGasOperationalName,
        oilGasIsBranchOffice,
        oilGasBranchLocation,
        petroOperationalName,
        petroIsBranchOffice,
        petroBranchLocation,
        numberOfPumps,
        profileImage,
        groupTin,
        nationalType,
        bvn,
        parentCompanyTin,
        hospitalIsBranchOffice,
        hospitalBranchLocation,
      } = req.body;

      // Validate userType
      if (![UserType.INDIVIDUAL, UserType.COMPANY].includes(userType)) {
        await session.abortTransaction();
        session.endSession();
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message:
            "Invalid user type. Please select either 'INDIVIDUAL' or 'COMPANY'.",
          status: "error",
        });
        return;
      }

      // Check for existing users
      let existingUser;
      // Trim and validate identifiers
      const trimmedNin = nin ? nin.trim() : null;
      const trimmedBvn = bvn ? bvn.trim() : null;
      let employerName: string | undefined;
      let groupName: string | undefined;
      if (userType === UserType.INDIVIDUAL) {
        if (nationalType === NationalType.NIGERIAN && trimmedNin) {
          logger.info("Checking NIN existence", { nin: trimmedNin });
          existingUser = await User.findOne({ nin: trimmedNin }).session(
            session
          );
          if (existingUser) {
            logger.warn("Duplicate NIN found", {
              email,
              nin: trimmedNin,
              ip: req.headers["x-forwarded-for"],
            });
            await session.abortTransaction();
            session.endSession();
            res.status(BAD_REQUEST_STATUS_CODE).json({
              message:
                "An account with this NIN already exists. Log in or contact support.",
              status: "error",
            });
            return;
          }
        }

        if (nationalType === NationalType.FOREIGN && trimmedBvn) {
          logger.info("Checking BVN existence", { bvn: trimmedBvn });
          existingUser = await User.findOne({ bvn: trimmedBvn }).session(
            session
          );
          if (existingUser) {
            logger.warn("Duplicate BVN found", {
              email,
              bvn: trimmedBvn,
              ip: req.headers["x-forwarded-for"],
            });
            await session.abortTransaction();
            session.endSession();
            res.status(BAD_REQUEST_STATUS_CODE).json({
              message:
                "An account with this BVN already exists. Log in or contact support.",
              status: "error",
            });
            return;
          }
        }
        // Validate employer TIN if employed
        if (employmentStatus === "EMPLOYED" && employerTin) {
          const employer = await User.findOne({
            tin: employerTin,
          }).session(session);

          if (!employer) {
            logger.warn("Invalid employer TIN provided", {
              email,
              employerTin,
              ip: req.headers["x-forwarded-for"],
            });
            await session.abortTransaction();
            session.endSession();
            res.status(BAD_REQUEST_STATUS_CODE).json({
              message:
                "No employer found for the provided Taxpayer Identification Number (TIN). Please verify the TIN.",
              status: "error",
            });
            return;
          }
        }
      } else if (userType === UserType.COMPANY) {
        // Check CAC uniqueness only if not a branch
        if (!parentCompanyTin) {
          existingUser = await User.findOne({ cacNumber }).session(session);
          if (existingUser) {
            logger.warn("Duplicate CAC registration attempt", {
              email,
              cacNumber,
              ip: req.headers["x-forwarded-for"],
            });
            await session.abortTransaction();
            session.endSession();
            res.status(BAD_REQUEST_STATUS_CODE).json({
              message:
                "An account with this CAC number already exists. Please log in or contact support.",
              status: "error",
            });
            return;
          }
        } else {
          // For branches: Validate parent exists and allow duplicate CAC

          if (
            institutionType !== "others" &&
            parentCompanyTin &&
            (bankIsBranchOffice ||
              oilGasIsBranchOffice ||
              hospitalIsBranchOffice)
          ) {
            const parentCompany = await User.findOne({
              tin: parentCompanyTin,
            }).session(session);
            if (!parentCompany) {
              await session.abortTransaction();
              session.endSession();
              res.status(BAD_REQUEST_STATUS_CODE).json({
                message:
                  "Invalid parent company TIN or parent is not a head office.",
                status: "error",
              });
              return;
            }
            // Optionally, check if parent has the same CAC
            if (parentCompany.cacNumber !== cacNumber) {
              await session.abortTransaction();
              session.endSession();
              res.status(BAD_REQUEST_STATUS_CODE).json({
                message: "Branch CAC must match parent company's CAC.",
                status: "error",
              });
              return;
            }
          }
        }
      }

      // Check email uniqueness
      const emailExists = await User.findOne({
        email: userType === UserType.COMPANY ? companyEmail : email,
      }).session(session);

      if (emailExists) {
        logger.warn("Duplicate email registration attempt", {
          email,
          userType,
          ip: req.headers["x-forwarded-for"],
        });
        await session.abortTransaction();
        session.endSession();
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message:
            "An account with this email already exists. Please log in or contact support.",
          status: "error",
        });
        return;
      }

      // Request TIN from pool
      const tin = await getSingleTINFromPool(userType, 4);
      if (!tin) {
        await session.abortTransaction();
        session.endSession();
        res.status(SERVER_ERROR_STATUS_CODE).json({
          message:
            "Unable to generate a Taxpayer Identification Number (TIN) at this time. Please try again later or contact support.",
          status: "error",
        });
        return;
      }

      // Generate and hash password
      const genPassword = generateUniquePassword();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(genPassword, salt);

      // Handle profile image upload
      let profileUrl = "";
      if (profileImage && profileImage.startsWith("data:image/")) {
        try {
          profileUrl = await uploadToCloudinary(profileImage, `profile_${tin}`);
        } catch (uploadError) {
          logger.error("Profile image upload failed", {
            error: uploadError,
            tin,
            email,
          });
        }
      }

      // Prepare base user data
      const userData: Partial<IUser> = {
        userType,
        tin,
        email: userType === UserType.COMPANY ? companyEmail : email,
        phone,
        passwordHash: hashedPassword,
        address: address || "",
        lga,
        state,
        proofOfResidency,
        secondaryPhone,
        natureOfBusiness,
        businessSector,
        uploadedFile,
        profileImage: profileUrl,
        requestId: uuidv4(),
        complianceScore: 0,
        complianceStatus: ComplianceStatus.PENDING,
        verificationStatus: VerificationStatus.PENDING,
        directorate: DirectorateType.TAXPAYER,
        outstandAmount: 0,
        penalties: 0,
      };

      // Add individual-specific data
      if (userType === UserType.INDIVIDUAL) {
        Object.assign(userData, {
          firstName,
          middleName,
          lastName,
          dateOfBirth,
          gender,
          nationality,
          maritalStatus,
          nin,
          employmentStatus,
          lgaOfResidence,
          stateOfResidence,
          nationalType,
          bvn,
        });
        if (employmentStatus === "EMPLOYED" && employerTin) {
          const employer = await User.findOne({ tin: employerTin }).session(
            session
          );
          if (!employer) {
            logger.error("Error getting the right employer taxpayer Id:", {
              messsage:
                "The employer Taxpayer Id you provided does not exists. You can reach out to your HR team for more information",
            });
            await session.abortTransaction();
            session.endSession();
            res.status(SERVER_ERROR_STATUS_CODE).json({
              message:
                "The employer Taxpayer Id you provided does not exists. You can reach out to your HR team for more information",
              status: "error",
            });
            return;
          }

          // Improved: Get name based on employer userType
          switch (employer.userType) {
            case UserType.COMPANY:
              employerName = employer.companyName;
              break;
            case UserType.MDA:
            case UserType.STATE:
            case UserType.LOCALGOVT:
            case UserType.FEDERAL:
              employerName = employer.agencyName;
              break;
            case UserType.GROUPS:
              employerName = employer.groupName;
              break;
            default:
              employerName =
                employer.companyName ||
                employer.agencyName ||
                employer.groupName;
          }
        }

        if (groupTin) {
          const group = await User.findOne({
            tin: groupTin,
            userType: UserType.GROUPS,
          }).session(session);
          if (!group) {
            await session.abortTransaction();
            session.endSession();
            res.status(BAD_REQUEST_STATUS_CODE).json({
              message: "Invalid group TIN provided.",
              status: "error",
            });
            return;
          }
          groupName = group.groupName;
        }

        Object.assign(userData, {
          employerName,
          groupTin,
          groupName,
          employerTin,
        });
      }

      // company-specific data
      if (userType === UserType.COMPANY) {
        Object.assign(userData, {
          companyName,
          cacNumber,
          companyType,
          registrationDate: new Date(registrationDate),
          city: city || "",
          headOfficeAddress,
          currentAddress,
          occupation,
          institutionType,
          lgaOfOperation,
          operationalZone,
          companyEmail,
        });

        // Add institution-specific data
        if (institutionType === InstitutionType.HOSPITAL) {
          Object.assign(userData, {
            numberOfBeds: numberOfBeds,
            operateMortuary,
            runLaboratory,
            parentCompanyTin,
            hospitalIsBranchOffice,
            ...(hospitalIsBranchOffice && { hospitalBranchLocation }),
            ...(hospitalIsBranchOffice && { parentCompanyTin }),
          });
        }

        if (institutionType === InstitutionType.BANK) {
          Object.assign(userData, {
            bankOperationalName,
            bankIsBranchOffice: bankIsBranchOffice,
            ...(bankIsBranchOffice && { bankBranchLocation }),
            ...(bankIsBranchOffice && { parentCompanyTin }),
          });
        }

        if (institutionType === InstitutionType.OIL_GAS) {
          Object.assign(userData, {
            oilGasOperationalName,
            oilGasIsBranchOffice: oilGasIsBranchOffice,
            ...(oilGasIsBranchOffice && { oilGasBranchLocation }),
            ...(oilGasIsBranchOffice && { parentCompanyTin }),
          });
        }

        if (institutionType === InstitutionType.PETROL_STATION) {
          Object.assign(userData, {
            petroOperationalName,
            petroIsBranchOffice: petroIsBranchOffice,
            ...(petroIsBranchOffice && { petroBranchLocation }),
            numberOfPumps: Number(numberOfPumps),
            ...(bankIsBranchOffice && { parentCompanyTin }),
          });
        }
      }

      // Determine role and directorate
      let roleCode;
      let directorate: DirectorateType;

      if (userType === UserType.COMPANY) {
        roleCode = "TAXPAYER_COMPANY";
        directorate = DirectorateType.TAXPAYER;
      } else if (userType === UserType.INDIVIDUAL) {
        roleCode = "TAXPAYER_INDIVIDUAL";
        directorate = DirectorateType.TAXPAYER;
      } else {
        roleCode = userType.toUpperCase();
        directorate =
          DirectorateType[
            userType.toUpperCase() as keyof typeof DirectorateType
          ] || DirectorateType.TAXPAYER;
      }

      const role = await Role.findOne({ roleCode }).session(session);
      if (!role) {
        await session.abortTransaction();
        session.endSession();
        logger.error(`Role ${roleCode} not found`);
        res.status(SERVER_ERROR_STATUS_CODE).json({
          message: `Role ${roleCode} not found. Contact support.`,
          status: "error",
        });
        return;
      }

      // Create user and role assignment
      const createdUser = await measureDatabaseQuery("Registration", () =>
        User.create([userData], { session })
      );
      await measureDatabaseQuery("RoleCreation", () =>
        UserRole.create(
          [
            {
              userId: createdUser[0].tin,
              roleId: role._id,
              assignedBy: "SYSTEM",
              assignedAt: new Date(),
              isActive: true,
              effectiveFrom: new Date(),
              reason:
                "This is a newly onboarded taxpayer for Akwa Ibom Internal Revenue Service.",
            },
          ],
          { session }
        )
      );

      // Prepare notification data
      const notificationData = {
        email: userData.email!,
        name:
          userType === UserType.INDIVIDUAL
            ? `${firstName || ""} ${lastName || ""}`.trim()
            : companyName || "",
        accountType: userType,
        tin,
        password: genPassword,
        notificationId: uuidv4(),
        profileLink: `${process.env.WEB_ORIGIN}/auth/signin`,
        unsubscribeLink: `${process.env.WEB_ORIGIN}/auth/signin`,
      };

      // Normalize phone for SMS
      const normalizedPhone =
        secondaryPhone && secondaryPhone.startsWith("0")
          ? normalizePhoneNumber(secondaryPhone)
          : secondaryPhone || normalizePhoneNumber(phone);

      // Send notifications
      await Promise.allSettled([
        sendUserMessage(USER_REGISTRATION_TOPIC, {
          user: {
            userId: tin,
            email: userData.email!,
            userType,
            createdAt: new Date(),
            firstName,
            lastName,
            companyName,
            nin,
            cacNumber,
            role: roleCode,
            state: stateOfResidence || state,
          },
        }),
        sendUserMessage(USER_NOTIFICATION_SUCCESS, notificationData),
        sendUserMessage(BULK_TAXPAYER_SMS_TOPIC, {
          phone: normalizedPhone,
          notificationId: uuidv4(),
          message: `Hi ${notificationData.name}, Welcome to AKIRS! Your credentials: Taxpayer ID: ${tin}, Password: ${genPassword}. Visit ${process.env.WEB_ORIGIN}/auth/signin to get started.`,
        }),
      ]);

      // Clear user cache
      try {
        const userRedisPattern = `redis:user:*`;
        const userRedisKeys = await redisClient.keys(userRedisPattern);
        if (userRedisKeys.length > 0) {
          await redisClient.del(userRedisKeys);
        }
        const cacheKey = `user:${tin}`;
        await redisClient.set(
          cacheKey,
          JSON.parse(createdUser[0].toObject()),
          "EX",
          60 * 24
        );
      } catch (cacheError) {
        logger.warn("Failed to clear user cache", { error: cacheError });
      }

      await session.commitTransaction();
      session.endSession();

      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
        message:
          "Your profile has been created successfully. Please check your email for credentials!",
        data: {
          tin,
          email: userData.email,
          userType,
          message: "Registration completed successfully",
        },
        status: "success",
      });
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      await session.endSession();

      logger.error("User registration failed", {
        error: error.message,
        stack: error.stack,
        userData: req.body,
        ip: req.headers["x-forwarded-for"],
      });

      if (error.code === 11000) {
        // Duplicate key error
        const duplicateField = error.keyPattern
          ? Object.keys(error.keyPattern)[0]
          : "unknown";
        const duplicateValue = error.keyValue
          ? error.keyValue[duplicateField]
          : "unknown";
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message: `Duplicate value for ${duplicateField}: ${duplicateValue}. This already exists.`,
          status: "error",
        });
        return;
      }
      res.status(error.statusCode || SERVER_ERROR_STATUS_CODE).json({
        message:
          error.message ||
          "An error occurred during registration. Please try again.",
        status: "error",
      });
    }
  }
);

/**
 * @description Registers a new Group (Association)
 * @route POST /api/v1/auth/group-signup
 * @access Protected (Super Admin or AKIRS)
 */
export const RegisterGroup = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        groupName,
        email,
        phone,
        secondaryPhone,
        address,
        lga,
        state,
        natureOfBusiness,
        businessSector,
        operationalZone,
        proofOfResidency,
        uploadedFile,
        roleCode = "GROUPS_ADMIN",
        chairmanName,
      } = req.body;

      // Set userType and directorate for groups
      const userType = UserType.GROUPS;
      const directorate = DirectorateType.GROUPS;

      // Check if group already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { phone }, { groupName }],
      }).session(session);

      if (existingUser) {
        await session.abortTransaction();
        session.endSession();
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message: "A group with this email, phone, or name already exists.",
          status: "error",
        });
        return;
      }

      // Validate role exists and matches directorate
      const role = await Role.findOne({
        roleCode,
        directorate,
        isActive: true,
      }).session(session);
      if (!role) {
        await session.abortTransaction();
        session.endSession();
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message: `Role ${roleCode} not found or not active for GROUPS directorate.`,
          status: "error",
        });
        return;
      }

      // Generate TIN
      const tin = await getSingleTINFromPool(userType, 4);
      if (!tin) {
        await session.abortTransaction();
        session.endSession();
        res.status(SERVER_ERROR_STATUS_CODE).json({
          message:
            "Unable to generate TIN at this time. Please try again later.",
          status: "error",
        });
        return;
      }
      // Generate password
      const genPassword = generateUniquePassword();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(genPassword, salt);

      const userData: Partial<IUser> = {
        userType,
        tin,
        email,
        phone,
        secondaryPhone,
        passwordHash: hashedPassword,
        address,
        lga,
        state,
        proofOfResidency,
        natureOfBusiness,
        businessSector,
        uploadedFile,
        groupName,
        groupTin: tin,
        operationalZone,
        directorate,
        requestId: uuidv4(),
        complianceScore: 0,
        position: chairmanName ? `Chairman: ${chairmanName}` : undefined,
      };

      // Create user
      const createdUser = await measureDatabaseQuery("GroupRegistration", () =>
        User.create([userData], { session })
      );
      const user = createdUser[0];

      // Assign role
      await measureDatabaseQuery("GroupRoleAssignment", () =>
        UserRole.create(
          [
            {
              userId: user.tin,
              roleId: role._id,
              assignedBy: req.user?.userId || "SYSTEM",
              assignedAt: new Date(),
              isActive: true,
              effectiveFrom: new Date(),
              reason: "Newly onboarded group/association for AKIRS.",
            },
          ],
          { session }
        )
      );

      // Notifications
      const normalizedPhone = normalizePhoneNumber(phone);
      const notificationData = {
        email,
        name: groupName,
        accountType: userType,
        tin,
        password: genPassword,
        notificationId: uuidv4(),
        profileLink: `${process.env.WEB_ORIGIN}/auth/signin`,
        phone: normalizedPhone,
        unsubscribeLink: `${process.env.WEB_ORIGIN}/auth/signin`,
        operationalZone,
        message: `Welcome to AKIRS! Group: ${groupName}, TIN: ${tin}, Password: ${genPassword}. Login at ${process.env.WEB_ORIGIN}/auth/signin`,
      };

      await Promise.allSettled([
        sendUserMessage(USER_REGISTRATION_TOPIC, {
          user: {
            userId: tin,
            email,
            userType,
            directorate,
            createdAt: new Date(),
            groupName,
          },
        }),
        sendUserMessage(GROUP_REGISTRATION_TOPIC, notificationData),
      ]);

      // Invalidate cache
      const userRedisPattern = `redis:user:*`;
      const userRedisKeys = await redisClient.keys(userRedisPattern);
      if (userRedisKeys.length > 0) {
        await redisClient.del(userRedisKeys);
      }

      await session.commitTransaction();
      session.endSession();

      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
        message:
          "Group onboarded successfully. Credentials sent via email/SMS.",
        data: {
          tin,
          email,
          groupName,
          userType,
          directorate,
        },
        status: "success",
      });
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      await session.endSession();

      logger.error("Group onboarding failed", {
        error: error.message,
        stack: error.stack,
        body: req.body,
      });

      if (error.code === 11000) {
        // Duplicate key error
        const duplicateField = error.keyPattern
          ? Object.keys(error.keyPattern)[0]
          : "unknown";
        const duplicateValue = error.keyValue
          ? error.keyValue[duplicateField]
          : "unknown";
        logger.info("duplicateField error", {
          duplicateField,
          duplicateValue,
        });
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message: `Duplicate value for ${duplicateField}: ${duplicateValue}. This already exists.`,
          status: "error",
        });
        return;
      }

      res.status(error.statusCode || SERVER_ERROR_STATUS_CODE).json({
        message: error.message || "An error occurred during group onboarding.",
        status: "error",
      });
    }
  }
);

/**
 * @description Registers admin users
 * @route POST /api/v1/auth/admin-signup
 * @access Protected (Super Admin only)
 */
export const RegisterAdminUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const {
        userType,
        email,
        phone,
        firstName,
        lastName,
        directorate,
        roleCode,
        address,
        lgaOfResidence,
        stateOfResidence,
        profileImage,
        agencyName,
        jurisdiction,
        taxStationIds,
        licenseNumber,
        scope,
        uploadedFile,
        proofOfResidency,
        reason,
        gender,
        nin,
      } = req.body;

      // Validate admin user types
      const adminUserTypes = [
        UserType.ADMIN,
        UserType.AKIRS,
        UserType.MDA,
        UserType.PAYE,
        UserType.WHT,
        UserType.ASSESSMENT,
        UserType.GROUPS,
        UserType.AGENT,
        UserType.CHAIRMAN,
        UserType.SUPERADMIN,
      ];

      if (!adminUserTypes.includes(userType)) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error(`Invalid admin user type: ${userType}`);
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { phone }],
      }).session(session);

      if (existingUser) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error("User with this email or phone already exists");
      }

      // Validate role exists
      const role = await Role.findOne({ roleCode, isActive: true }).session(
        session
      );
      if (!role) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error(`Role ${roleCode} not found or inactive`);
      }

      // Validate directorate alignment
      if (role.directorate !== directorate) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error(
          `Role ${roleCode} does not belong to ${directorate} directorate`
        );
      }

      // Validate tax stations if provided
      let validatedTaxStations: mongoose.Types.ObjectId[] = [];
      if (taxStationIds?.length > 0) {
        const stations = await TaxStation.find({
          _id: { $in: taxStationIds },
        }).session(session);

        if (stations.length !== taxStationIds.length) {
          res.status(BAD_REQUEST_STATUS_CODE);
          throw new Error("One or more tax stations not found");
        }
        validatedTaxStations = taxStationIds.map(
          (id: string) => new mongoose.Types.ObjectId(id)
        );
      }

      // Generate credentials
      // Request TIN
      const tin = await getSingleTINFromPool(userType, 4);
      if (!tin) {
        await session.abortTransaction();
        res.status(SERVER_ERROR_STATUS_CODE);
        throw new Error(
          "Unable to generate a Taxpayer Identification Number (TIN) at this time. Please try again later or contact support"
        );
      }

      const password = generateUniquePassword();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Handle profile image upload
      let profileUrl = "";
      if (profileImage && profileImage.startsWith("data:image/jpeg;base64,")) {
        try {
          profileUrl = await uploadToCloudinary(
            profileImage,
            `nin_${nin}_photo`
          );
        } catch (error) {
          await session.abortTransaction();
          res.status(SERVER_ERROR_STATUS_CODE).json({
            message:
              "Failed to Upload Image, Please try again or you can contact the support team.",
          });
          return;
        }
      }
      // Prepare user data
      const userData: Partial<IUser> = {
        userType,
        tin,
        email,
        phone,
        firstName,
        lastName,
        passwordHash: hashedPassword,
        address,
        lgaOfResidence,
        stateOfResidence,
        profileImage: profileUrl,
        requestId: uuidv4(),
        uploadedFile,
        proofOfResidency,
        gender,
        directorate,
        nin,
      };

      logger.info("profile data:", {
        profileUrl,
        userData,
      });

      // Add directorate-specific fields
      switch (directorate) {
        case DirectorateType.MDA:
          userData.agencyName = agencyName;
          break;
        case DirectorateType.AGENT:
          userData.licenseNumber = licenseNumber;
          userData.agencyName = agencyName;
          break;
        case DirectorateType.PAYE:
        case DirectorateType.WHT:
        case DirectorateType.ASSESSMENT:
          userData.agencyName = agencyName || `${directorate} Office`;
          break;
      }

      // Create user
      const [createdUser] = await User.create([userData], { session });

      // Assign role with scope
      const userRoleData = {
        userId: createdUser.tin,
        roleId: role._id,
        assignedBy: req.user?.userId || "SYSTEM",
        assignedAt: new Date(),
        isActive: true,
        effectiveFrom: new Date(),
        scope: scope || {},
        reason,
      };

      await UserRole.create([userRoleData], { session });
      const normalizedPhone = phone.startsWith("0")
        ? normalizePhoneNumber(phone)
        : phone;
      // Send notifications
      const notificationData = {
        email,
        name: `${firstName} ${lastName}`,
        accountType: userType,
        directorate,
        tin,
        password,
        roleCode,
        notificationId: uuidv4(),
        profileLink: `${process.env.WEB_ORIGIN}/auth/signin`,
        phone: normalizedPhone,
        message: `Welcome to AKIRS ${directorate}! Your admin credentials - TIN: ${tin}, Password: ${password}. Login: ${process.env.WEB_ORIGIN}/auth/signin`,
      };

      await Promise.all([
        sendUserMessage(USER_REGISTRATION_TOPIC, {
          user: {
            userId: tin,
            email,
            userType,
            directorate,
            role: roleCode,
            createdAt: new Date(),
            firstName,
            lastName,
          },
        }),
        sendUserMessage(ADMIN_REGISTRATION_TOPIC, notificationData),
        // sendUserMessage(BULK_TAXPAYER_SMS_TOPIC, {
        //   phone: normalizedPhone,
        //   message: `Welcome to AKIRS ${directorate}! Your admin credentials - TIN: ${tin}, Password: ${password}. Login: ${process.env.WEB_ORIGIN}/auth/signin`,
        // }),
      ]);

      await session.commitTransaction();
      await session.endSession();
      logger.info("Admin user created successfully", {
        tin,
        userType,
        directorate,
      });
      const userRedisPattern = `redis:user:*`;
      const userRedisKeys = await redisClient.keys(userRedisPattern);
      if (userRedisKeys.length > 0) {
        await redisClient.del(userRedisKeys);
        logger.info("User cache invalidated", {
          userRedisKeys,
        });
      }

      await sendUserMessage(ADMIN_CREATION, {
        userId: createdUser.tin,
        roleCode,
        createdBy: req.user?.name || "SYSTEM",
      });
      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
        message: "Admin user created successfully",
        data: {
          tin,
          email,
          userType,
          directorate,
          role: roleCode,
        },
        status: "success",
      });
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      if (error.code === 11000) {
        // Duplicate key error
        const duplicateField = error.keyPattern
          ? Object.keys(error.keyPattern)[0]
          : "unknown";
        const duplicateValue = error.keyValue
          ? error.keyValue[duplicateField]
          : "unknown";
        logger.info("duplicateField error", {
          duplicateField,
          duplicateValue,
        });
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message: `Duplicate value for ${duplicateField}: ${duplicateValue}. This already exists.`,
          status: "error",
        });
        return;
      }
      await session.endSession();

      logger.error("Admin user creation failed", { error: error.message });
      res.status(error.statusCode || SERVER_ERROR_STATUS_CODE).json({
        message: error.message,
        status: "error",
      });
    }
  }
);

/**
 * @description Registers agency users (FEDERAL, STATE, LOCALGOVT)
 * @route POST /api/v1/auth/agency-signup
 * @access Protected (Super Admin only)
 */
export const RegisterAgency = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        userType,
        agencyName,
        email,
        phone,
        secondaryPhone,
        address,
        lgaOfOperation,
        operationalZone,
        isSubOffice,
        subOfficeAddress,
        roleCode,
        proofOfResidency,
        directorate = DirectorateType.MDA,
      } = req.body;

      // Check if agency already exists
      const existingUser = await User.findOne({
        $or: [{ email: email }, { phone: phone }],
      }).session(session);

      if (existingUser) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error("Agency with this email or phone already exists");
      }

      // Generate TIN and credentials
      const tin = await getSingleTINFromPool(userType, 4);
      if (!tin) {
        await session.abortTransaction();
        session.endSession();
        res.status(SERVER_ERROR_STATUS_CODE).json({
          message:
            "Unable to generate a Taxpayer Identification Number (TIN) at this time. Please try again later or contact support.",
          status: "error",
        });
        return;
      }

      const genPassword = generateUniquePassword();
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(genPassword, salt);

      // Validate and fetch role (agency-specific roleCode, "AGENCY_ADMIN")
      const role = await Role.findOne({
        roleCode: roleCode || "AGENCY_ADMIN",
      }).session(session);
      if (!role) {
        await session.abortTransaction();
        session.endSession();
        logger.error(`Role ${roleCode || "AGENCY_ADMIN"} not found`);
        res.status(SERVER_ERROR_STATUS_CODE).json({
          message: `Role ${
            roleCode || "AGENCY_ADMIN"
          } not found. Please you can reach out to the Contact support.`,
          status: "error",
        });
        return;
      }

      //
      if (role.directorate !== directorate) {
        await session.abortTransaction();
        session.endSession();
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error(
          `Role ${role.roleCode} does not belong to ${directorate} directorate`
        );
      }

      // Prepare user data
      const userData: Partial<IUser> = {
        userType: userType,
        tin,
        email: email,
        phone: phone,
        secondaryPhone: secondaryPhone,
        passwordHash: hashedPassword,
        address: address,
        lgaOfOperation: lgaOfOperation,
        operationalZone: operationalZone,
        isSubOffice: isSubOffice,
        subOfficeAddress: subOfficeAddress,
        agencyName: agencyName,
        proofOfResidency: proofOfResidency,
        directorate: directorate,
        requestId: uuidv4(),
        lastActiveAt: new Date(),
      };

      logger.info("Agency profile data:", { userData });

      // Create user
      const createdUser = await measureDatabaseQuery("AgencyRegistration", () =>
        User.create([userData], { session })
      );
      const user = createdUser[0];

      // Assign role
      await measureDatabaseQuery("AgencyRoleAssignment", () =>
        UserRole.create(
          [
            {
              userId: user.tin,
              roleId: role._id,
              assignedBy: (req as any).user?.userId || "SYSTEM",
              assignedAt: new Date(),
              isActive: true,
              effectiveFrom: new Date(),
              reason:
                "Newly onboarded agency for Akwa Ibom Internal Revenue Service.",
            },
          ],
          { session }
        )
      );

      const normalizedPhone = phone.startsWith("0")
        ? normalizePhoneNumber(phone)
        : phone;
      // Prepare notification data
      const notificationData = {
        email: email,
        name: agencyName,
        accountType: userType,
        tin,
        password: genPassword,
        notificationId: uuidv4(),
        profileLink: `${process.env.WEB_ORIGIN}/auth/signin`,
        phone: normalizedPhone,
        message: `Welcome to AKIRS ${directorate}! Your agency credentials - TIN: ${tin}, Password: ${genPassword}. Login: ${process.env.WEB_ORIGIN}/auth/signin`,
      };

      // Send notifications
      await Promise.all([
        sendUserMessage(USER_REGISTRATION_TOPIC, {
          user: {
            userId: tin,
            email: email,
            userType: userType,
            directorate: directorate,
            role: role.roleCode,
            createdAt: new Date(),
            agencyName: agencyName,
          },
        }),
        sendUserMessage(AGENCY_REGISTRATION_TOPIC, notificationData),
      ]);

      await session.commitTransaction();
      await session.endSession();

      logger.info("Agency user created successfully", {
        tin,
        userType: userType,
        directorate: directorate,
        agencyName: agencyName,
      });

      // Invalidate user cache
      const userRedisPattern = `redis:user:*`;
      const userRedisKeys = await redisClient.keys(userRedisPattern);
      if (userRedisKeys.length > 0) {
        await redisClient.del(userRedisKeys);
        logger.info("User cache invalidated", {
          userRedisKeys: userRedisKeys.length,
        });
      }

      // Send admin creation event
      await sendUserMessage(ADMIN_CREATION, {
        userId: user.tin,
        roleCode: role.roleCode,
        createdBy: (req as any).user?.name || "SYSTEM",
      });

      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
        message: "Agency user created successfully",
        data: {
          tin,
          email: email,
          userType: userType,
          directorate: directorate,
          agencyName: agencyName,
          role: role.roleCode,
        },
        status: "success",
      });
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      await session.endSession();
      if (error.code === 11000) {
        // Duplicate key error
        const duplicateField = error.keyPattern
          ? Object.keys(error.keyPattern)[0]
          : "unknown";
        const duplicateValue = error.keyValue
          ? error.keyValue[duplicateField]
          : "unknown";
        logger.info("duplicateField error", {
          duplicateField,
          duplicateValue,
        });
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message: `Duplicate value for ${duplicateField}: ${duplicateValue}. This already exists.`,
          status: "error",
        });
        return;
      }
      logger.error("Agency user creation failed", {
        error: error.message,
        stack: error.stack,
        userType: req.body.userType,
      });
      res.status(error.statusCode || SERVER_ERROR_STATUS_CODE).json({
        message: error.message,
        status: "error",
      });
    }
  }
);

/**
 * @description Logs in the user and initiates 2FA.
 * @route POST /api/v1/auth/login
 * @access Public
 * @param {object} req.body - { tin, password }
 */
const LoginUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { tin, password, idempotencyKey } = req.body;
    const notificationId = idempotencyKey ? idempotencyKey : uuidv4();

    // Validate input
    if (!tin || !password) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("TIN and password are required");
    }

    const cacheKey = `user:${tin}`;
    let cachedUser = await redisClient.get(cacheKey);
    let user: any;
    if (cachedUser) {
      trackCacheHit("redis", "user_login_lookup");
      user = JSON.parse(cachedUser);
    } else {
      trackCacheMiss("redis", "user_lookup");
      user = await measureDatabaseQuery("login", async () =>
        User.findOne({ tin }).select(
          "+passwordHash +phone +email +companyEmail +userType +firstName +lastName +companyName +agencyName +groupName"
        )
      );

      if (user) {
        await redisClient.setex(
          cacheKey,
          REDIS_TTL,
          JSON.stringify(user.toObject())
        );
      }
    }

    if (!user) {
      logger.info("User with invalid TIN attempting to sign in", {
        tin,
        ip: req.headers["x-forwarded-for"],
        userAgent: req.headers["user-agent"],
      });
      res.status(NOT_FOUND_STATUS_CODE);
      throw new Error("You do not have any record with us!!");
    }

    // Check for false identification flag
    if (user.falseIdentificationFlag) {
      logger.warn("Login attempt blocked due to false identification flag", {
        tin,
        ip: req.headers["x-forwarded-for"],
      });
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message:
          "Your account has been restricted due to suspected false information. Please contact support to resolve this issue.",
        status: "error",
      });
      return;
    }
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Please provide a valid password!");
    }
    const fullName =
      user.userType === "INDIVIDUAL"
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : user.companyName ||
          `${user.firstName || user.agencyName || user.groupName || ""} ${
            user.lastName || ""
          }`;
    // Generate 2FA token
    const twoFAToken = await generateSecureToken(user._id.toString(), "2fa");
    const { secondaryPhone, phone } = user;
    const normalizedPhone =
      user?.userType === "INDIVIDUAL" || user?.userType === "COMPANY"
        ? secondaryPhone!.startsWith("0")
          ? normalizePhoneNumber(secondaryPhone!)
          : secondaryPhone
        : normalizePhoneNumber(phone!);
    // Store 2FA token in Redis with expiration (120 seconds)
    await redisClient.setex(
      `2fa:${user.tin}`,
      15 * 60,
      JSON.stringify({
        token: twoFAToken,
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      })
    );

    // REPORTING EVENT
    await sendUserMessage(USER_LOGIN_TOPIC, {
      user: {
        userId: user.tin,
        email: user.userType === "INDIVIDUAL" ? user.email : user?.companyEmail,
        userType: user.userType,
        loginTime: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        twoFATokenSent: true,
      },
    });
    // Send 2FA code via SMS and email
    await sendUserMessage(LOGIN_2FA_TOPIC, {
      token: twoFAToken,
      phone: normalizedPhone,
      notificationId,
      email:
        user.userType === "INDIVIDUAL"
          ? user.email
          : user.userType === "COMPANY"
          ? user?.companyEmail
          : user?.email,
      fullName,
      message: `Hi, ${fullName}, Your 2FA code for AKIRS signin is ${twoFAToken}. It expires in 5 minutes.`,
    });
    res.status(200).json({
      message: "2FA code has been sent to your phone and email. Please verify.",
      userId: user.tin,
    });
  }
);

/**
 * @description Verifies the 2FA token and issues JWT.
 * @route POST /api/v1/auth/verify-2fa
 * @access Public
 * @param {object} req.body - { userId, twoFAToken }
 */
const Verify2FA = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId, twoFAToken } = req.body;
    // Validate input
    if (!userId || !twoFAToken) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("userId and 2FA token are required");
    }

    // Find user
    const user = await measureDatabaseQuery(
      "2FA",
      async () => await User.findOne({ tin: userId }).select("-passwordHash")
    );

    if (!user) {
      logger.error("This user does not exists", { userId });
      res.status(NOT_FOUND_STATUS_CODE);
      throw new Error("This user does not exists in AKIRS database");
    }

    // Retrieve 2FA token from Redis
    const cachedTokenStr = await redisClient.get(`2fa:${userId}`);
    if (!cachedTokenStr) {
      logger.error("No 2FA token found in cache", { userId });
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Invalid or expired 2FA token");
    }

    const cachedToken = JSON.parse(cachedTokenStr);
    if (
      cachedToken.token !== twoFAToken ||
      new Date(cachedToken.expiresAt) < new Date()
    ) {
      logger.error("Invalid or expired 2FA token", { userId });
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Invalid or expired 2FA token");
    }

    const fullName =
      user.userType === "INDIVIDUAL"
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : user.companyName ||
          `${user.firstName || user.agencyName || user.groupName || ""} ${
            user.lastName || ""
          }`;
    const { accessToken, refreshToken } = await generateToken(
      res,
      user.tin,
      user.userType,
      fullName
    );

    await User.updateOne(
      { tin: userId },
      { $set: { lastActiveAt: new Date() } }
    );
    logger.info("User signned in succesfully using 2FA", {
      userId,
      service: "auth_service",
    });
    await redisClient.del(`2fa:${userId}`);

    res.status(200).json({
      accessToken,
      refreshToken,
      user,
    });
  }
);

/**
 * @description Restricts an account by setting falseIdentificationFlag to true.
 * @route POST /api/v1/auth/restrict-account
 * @access Protected (Admin/SuperAdmin only)
 * @param {object} req.body - { tin }
 */
const RestrictAccountHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { tin } = req.body;
    const { userId: restrictedByTin, name: restrictedByName } = req.user || {
      userId: "SYSTEM",
      name: "SYSTEM",
    };
    // Validate input
    if (!tin) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("TIN is required");
    }

    // Check if user exists
    const user = await measureDatabaseQuery("restrictAccount", async () =>
      User.findOne({ tin }).select("+falseIdentificationFlag")
    );

    if (!user) {
      res.status(NOT_FOUND_STATUS_CODE);
      throw new Error("User with the provided TIN not found");
    }

    // Check if already restricted
    if (user.falseIdentificationFlag) {
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message: "Account is already restricted",
        status: "error",
      });
      return;
    }

    // Update falseIdentificationFlag
    await measureDatabaseQuery("updateRestriction", async () =>
      User.updateOne(
        { tin },
        {
          $set: { falseIdentificationFlag: true },
          $currentDate: { updatedAt: true },
        }
      )
    );

    // Fetch updated user to update cache
    const updatedUser = await measureDatabaseQuery(
      "fetchUpdatedUser",
      async () => User.findOne({ tin }).select("+falseIdentificationFlag")
    );

    if (!updatedUser) {
      logger.error("Updated user not found after restriction update", { tin });
      res.status(SERVER_ERROR_STATUS_CODE).json({
        message: "Failed to retrieve updated user data.",
        status: "error",
      });
      return;
    }

    // Invalidate old cache and set new cache
    const cacheKey = `user:${tin}`;
    await redisClient.del(cacheKey);

    try {
      await redisClient.setex(
        cacheKey,
        REDIS_TTL,
        JSON.stringify(updatedUser.toObject())
      );
      logger.info("Cache updated with unrestricted user data", {
        tin,
        cacheKey,
        ttl: REDIS_TTL,
      });
    } catch (cacheError) {
      logger.warn("Failed to update cache, but account unrestricted", {
        tin,
        error: cacheError instanceof Error ? cacheError.message : cacheError,
      });
    }

    const fullName =
      updatedUser.userType === "INDIVIDUAL"
        ? `${updatedUser.firstName || ""} ${updatedUser.lastName || ""}`.trim()
        : updatedUser.companyName ||
          `${
            updatedUser.firstName ||
            updatedUser.agencyName ||
            updatedUser.groupName ||
            ""
          } ${updatedUser.lastName || ""}`;

    await sendUserMessage(ACCOUNT_RESTRICTION, {
      restrictedTin: tin,
      restrictedAccount: fullName,
      restrictedByTin,
      restrictedByName,
    });

    logger.info("Account unrestricted successfully", {
      tin,
      ip: req.ip,
      falseIdentificationFlag: updatedUser.falseIdentificationFlag,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      message: "Account has been restricted successfully",
      data: { tin },
      status: "success",
    });
  }
);

/**
 * @description Unrestricts an account by setting falseIdentificationFlag to false.
 * @route POST /api/v1/auth/unrestrict-account
 * @access Protected (Admin/SuperAdmin only)
 * @param {object} req.body - { tin }
 */
const UnrestrictAccountHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { tin } = req.body;
    const { userId: restrictedByTin, name: restrictedByName } = req.user || {
      userId: "SYSTEM",
      name: "SYSTEM",
    };
    // Validate input
    if (!tin) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("TIN is required");
    }

    // Check if user exists
    const user = await measureDatabaseQuery("unrestrictAccount", async () =>
      User.findOne({ tin }).select("+falseIdentificationFlag")
    );

    if (!user) {
      res.status(NOT_FOUND_STATUS_CODE);
      throw new Error("User with the provided TIN not found");
    }

    // Check if already unrestricted
    if (!user.falseIdentificationFlag) {
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message: "Account is already unrestricted",
        status: "error",
      });
      return;
    }

    // Update falseIdentificationFlag
    const updateResult = await measureDatabaseQuery(
      "updateUnrestriction",
      async () =>
        User.updateOne(
          { tin },
          {
            $set: { falseIdentificationFlag: false },
            $currentDate: { updatedAt: true },
          }
        )
    );

    if (updateResult.modifiedCount === 0) {
      logger.error("Failed to update account restriction", { tin, ip: req.ip });
      res.status(SERVER_ERROR_STATUS_CODE).json({
        message: "Failed to unrestrict account. Please try again.",
        status: "error",
      });
      return;
    }

    // Fetch updated user to update cache
    const updatedUser = await measureDatabaseQuery(
      "fetchUpdatedUser",
      async () => User.findOne({ tin }).select("+falseIdentificationFlag")
    );

    if (!updatedUser) {
      logger.error("Updated user not found after restriction update", { tin });
      res.status(SERVER_ERROR_STATUS_CODE).json({
        message: "Failed to retrieve updated user data.",
        status: "error",
      });
      return;
    }

    // Invalidate old cache and set new cache
    const cacheKey = `user:${tin}`;
    await redisClient.del(cacheKey);

    try {
      await redisClient.setex(
        cacheKey,
        REDIS_TTL,
        JSON.stringify(updatedUser.toObject())
      );
      logger.info("Cache updated with unrestricted user data", {
        tin,
        cacheKey,
        ttl: REDIS_TTL,
      });
    } catch (cacheError) {
      logger.warn("Failed to update cache, but account unrestricted", {
        tin,
        error: cacheError instanceof Error ? cacheError.message : cacheError,
      });
    }

    const fullName =
      updatedUser.userType === "INDIVIDUAL"
        ? `${updatedUser.firstName || ""} ${updatedUser.lastName || ""}`.trim()
        : updatedUser.companyName ||
          `${
            updatedUser.firstName ||
            updatedUser.agencyName ||
            updatedUser.groupName ||
            ""
          } ${updatedUser.lastName || ""}`;

    await sendUserMessage(ACCOUNT_UNRESTRICTION, {
      restrictedTin: tin,
      restrictedAccount: fullName,
      restrictedByTin,
      restrictedByName,
    });

    logger.info("Account unrestricted successfully", {
      tin,
      ip: req.ip,
      falseIdentificationFlag: updatedUser.falseIdentificationFlag,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      message: "Account has been unrestricted successfully",
      data: {
        tin,
        falseIdentificationFlag: updatedUser.falseIdentificationFlag,
      },
      status: "success",
    });
  }
);

/**
 * @description It reset the password of a user
 * @route POST /api/v1/auth/request-reset
 * @access Public (it does not need a JWT authentication)
 * @param {object} req.body
 */
const RequestPasswordResetHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { tin } = req.body;

    if (!tin) {
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message: `Please provide a valid Taxpayer Identification Number (TIN).`,
      });
      return;
    }

    // Find the user
    const user = await User.findOne({ tin });
    if (!user) {
      res.status(NOT_FOUND_STATUS_CODE).json({
        message: `No account found for the provided Taxpayer Identification Number (TIN). Please verify the TIN or register a new account.`,
      });
      return;
    }

    // Generate reset token
    const token = await generateSecureToken(user._id.toString());
    const fullName =
      user.userType === "INDIVIDUAL"
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : user.userType === "COMPANY"
        ? user.companyName
        : `${user.firstName || user.agencyName || user.groupName || ""} ${
            user.lastName || ""
          }`;
    // Send reset email
    await sendUserMessage("tms.auth.password.rest.token", {
      email: user?.email,
      token,
      name: fullName,
    });

    res.status(200).json({
      message:
        "A password reset link has been sent to your registered email address. Please check your inbox or spam folder.",
    });
  }
);

/**
 * @description Refreshes the JWT using a refresh token.
 * @route POST /api/v1/auth/refresh-token
 * @access Public
 */
const RefreshToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Refresh token is required");
    }

    // Verify refresh token in Redis
    const cachedRefreshToken = await redisClient.get(`refresh:${refreshToken}`);
    if (!cachedRefreshToken) {
      res.status(401);
      throw new Error("Invalid or expired refresh token");
    }

    const { tin, userType, name } = JSON.parse(cachedRefreshToken);

    // Generate new access token
    const newAccessToken = signJwt(tin, userType, name);
    // Generate new refresh otken
    const newRefreshToken = await generateSecureToken(tin, "refresh");
    // persist the new refresh token in redis.
    await redisClient.set(
      `refresh:${newRefreshToken}`,
      JSON.stringify({ tin, userType, name }),
      "EX",
      REDIS_TTL
    );
    // Set new access token in cookie
    res.cookie("jwt", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + 15 * 60 * 1000),
      path: "/",
    });

    await redisClient.del(`refresh:${refreshToken}`);
    logger.info("Refresh token rotated", {
      userId: tin,
      ip: req.headers["x-forwarded-for"],
      userAgent: req.headers["user-agent"],
    });
    res
      .status(200)
      .json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  }
);

/**
 * @description Handler to reset user password
 * @param csvData
 * @returns
 */
const ResetPasswordHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate input
    const { token, newPassword } = req.body;

    if (!token || typeof token !== "string") {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Invalid or missing password reset token");
    }

    if (!newPassword || typeof newPassword !== "string") {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Invalid or missing new password");
    }

    // Find the reset token
    const resetToken = await PasswordResetToken.findOne({ token });
    if (!resetToken) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error(
        "The provided password reset token is not valid. Please request for a new token"
      );
    }

    // Check if token has expired
    if (resetToken.expiresAt < new Date()) {
      await resetToken.deleteOne();
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error(
        "The password reset token has expired. Please request a new reset link."
      );
    }

    // Find the user
    const user = await User.findById(resetToken.userId);
    if (!user) {
      res.status(NOT_FOUND_STATUS_CODE);
      throw new Error(
        "No account found for the provided token. Please verify your details or register a new account"
      );
    }

    try {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Update the user's password
      user.passwordHash = passwordHash;
      await user.save();

      // Delete the reset token
      await resetToken.deleteOne();

      // Update Redis cache
      const cacheKey = `user:${user.tin}`;
      const userObject = user.toObject();
      await redisClient.setex(cacheKey, REDIS_TTL, JSON.stringify(userObject));

      logger.info("Password reset successfully", { email: user.email });

      res.status(200).json({
        message:
          "Your password has been successfully reset. You can now log in with your new password",
      });
    } catch (error) {
      logger.error("Error during password reset process", {
        error:
          error instanceof Error
            ? error.message
            : "an unknown error has occurred",
        stack:
          error instanceof Error
            ? error.stack
            : "an unknown error stack has occurred",
        token,
        userId: user?._id,
      });
      res.status(500);
      throw new Error("An error occurred while resetting the password");
    }
  }
);

/**
 *
 * @description Handler to change user password
 * @param csvData
 * @returns
 */
const ChangePasswordHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { newPassword, tin } = req.body;

    if (!newPassword || !tin) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("TIN and New password are required");
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await User.updateOne(
      { tin },
      {
        passwordHash,
      }
    );

    // IND ECQ71OF

    // logger.info("Password reset successfully", { newPassword: newPassword });

    res.status(200).json({ message: "Password reset successfully" });
  }
);

/**
 * @description Handler to logout taxpayer
 * @param csvData
 * @returns
 */
const LogoutUserHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    res.cookie("jwt", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || false,
    });
    res.status(200).json({ message: "Logged out succesfully!!" });
  }
);

/**
 * @description Upload Individual data for bulk taxpayer creation
 * @route POST /api/v1/auth/bulk-taxpayer-upload
 * @access Private
 */
const UploadTaxpayerCSVHandler = asyncHandler(
  async (
    req: Request<{}, {}, { csvUrl: string; publicId: string; name: string }>,
    res: Response
  ) => {
    const user = req.user as { userId: string };
    const { userId } = user;
    const { csvUrl, publicId, name } = req.body;

    // Validate input
    if (!csvUrl || !publicId || !name) {
      res.status(BAD_REQUEST_STATUS_CODE).json({
        error: "csvUrl, publicId, and name are required",
        status: "error",
      });
      return;
    }

    // Initialize progress in Redis
    const progressKey = `bulk_national_taxpayer_upload_progress:${publicId}:${userId}`;
    await redisClient.setex(
      progressKey,
      SECONDS_IN_7_DAYS,
      JSON.stringify({
        totalTaxpayers: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        startTime: Date.now(),
      })
    );

    // Queue the job
    const requestId = uuidv4();
    await sendUserMessage(BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC, {
      requestId,
      csvUrl,
      publicId,
      employerTin: userId,
      name,
    });

    logger.info("Bulk taxpayer upload job queued", {
      publicId,
      requestId,
      employerTin: userId,
    });

    res.status(202).json({
      message:
        "Bulk taxpayer upload job queued. Check progress at the upload status table for your upload progress.",
      publicId,
      status: "pending",
    });
  }
);

/**
 * @description Upload Individual data for bulk taxpayer creation
 * @route POST /api/v1/auth/bulk-taxpayer-upload
 * @access Private
 */
const UploadCompanyBranchCSVHandler = asyncHandler(
  async (
    req: Request<{}, {}, { csvUrl: string; publicId: string; name: string }>,
    res: Response
  ) => {
    const user = req.user as { userId: string };
    const { userId } = user;
    const { csvUrl, publicId, name } = req.body;

    // Validate input
    if (!csvUrl || !publicId || !name) {
      res.status(BAD_REQUEST_STATUS_CODE).json({
        error: "csvUrl, publicId, and name are required",
        status: "error",
      });
      return;
    }

    // Initialize progress in Redis
    const progressKey = `bulk_national_taxpayer_upload_progress:${publicId}:${userId}`;
    await redisClient.setex(
      progressKey,
      SECONDS_IN_7_DAYS,
      JSON.stringify({
        totalTaxpayers: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        startTime: Date.now(),
      })
    );

    // Queue the job
    const requestId = uuidv4();
    await sendUserMessage(BULK_COMPANY_BRANCH_UPLOAD_TOPIC, {
      requestId,
      csvUrl,
      publicId,
      employerTin: userId,
      name,
    });

    logger.info("Bulk company branch upload job queued", {
      publicId,
      requestId,
      employerTin: userId,
    });

    res.status(202).json({
      message:
        "Bulk company branch upload job queued. Check progress at the upload status table for your upload progress.",
      publicId,
      status: "pending",
    });
  }
);

/**
 * @description Upload bulk company data for bulk taxpayer creation
 * @route POST /api/v1/auth/bulk-taxpayer-upload/company
 * @access Private
 */
const UploadBulkCompanyCSVHandler = asyncHandler(
  async (
    req: Request,
    res: Response
  ) => {
    const user = req.user as { userId: string };
    const { userId } = user;
    const { csvUrl, publicId, institutionType, requestId } = req.body;

    // Initialize progress in Redis
    const progressKey = `bulk_company_upload_progress:${publicId}:${userId}`;
    await redisClient.setex(
      progressKey,
      SECONDS_IN_7_DAYS,
      JSON.stringify({
        totalTaxpayers: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        startTime: Date.now(),
      })
    );
    await sendUserMessage(BULK_COMPANY_UPLOAD_TOPIC, {
      requestId,
      csvUrl,
      publicId,
      adminTIN: userId,
      institutionType,
    });

    logger.info("Bulk company upload job queued", {
      publicId,
      requestId,
      employerTin: userId,
    });

    res.status(202).json({
      message:
        "Bulk company upload job queued. Check progress at the upload status table for your upload progress.",
      publicId,
      status: "pending",
    });
  }
);

/**
 * @description Upload Expartiate Individual data for bulk taxpayer creation
 * @route POST /api/v1/auth/bulk-taxpayer-upload
 * @access Private
 */

const UploadExpartiateTaxpayerCSVHandler = asyncHandler(
  async (
    req: Request<{}, {}, { csvUrl: string; publicId: string; name: string }>,
    res: Response
  ) => {
    const user = req.user as { userId: string };
    const { userId } = user;
    const { csvUrl, publicId, name } = req.body;

    // Initialize progress in Redis
    const progressKey = `bulk_expartiate_taxpayer_upload_progress:${publicId}:${userId}`;
    await redisClient.setex(
      progressKey,
      SECONDS_IN_7_DAYS,
      JSON.stringify({
        totalTaxpayers: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        startTime: Date.now(),
      })
    );

    // Queue the job
    const requestId = uuidv4();
    await sendUserMessage(BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC, {
      requestId,
      csvUrl,
      publicId,
      employerTin: userId,
      name,
    });

    logger.info("Bulk taxpayer upload job queued", {
      publicId,
      requestId,
      employerTin: userId,
    });

    res.status(202).json({
      message:
        "Bulk expartiate taxpayer upload job has been queued. Please kindly check progress at the upload status table for your upload progress.",
      publicId,
      status: "pending",
    });
  }
);

/**
 * @description SSE endpoint for real-time progress updates
 * @route GET /api/v1/auth/bulk-taxpayer-progress/:publicId
 * @access Private
 */
const BulkTaxpayerProgressHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { publicId } = req.params;
    const user = req.user as { userId: string };
    const { userId } = user;

    // **FIX 1: PROPER SSE HEADERS**
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*"); // For Next.js
    res.flushHeaders();

    const progressKey = `bulk_national_taxpayer_upload_progress:${publicId}:${userId}`;
    let lastProgress: IProgressTracker | null = null;

    //  SEND INITIAL STATE IMMEDIATELY
    try {
      const initialProgress = await getProgress(progressKey);
      res.write(`data: ${JSON.stringify(initialProgress)}\n\n`);
      lastProgress = initialProgress;
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: "No progress found" })}\n\n`);
    }

    const interval = setInterval(async () => {
      try {
        const progress = await getProgress(progressKey);
        if (JSON.stringify(progress) !== JSON.stringify(lastProgress)) {
          res.write(`data: ${JSON.stringify(progress)}\n\n`);
          lastProgress = progress;
        }
        // Stop if processing is complete
        if (
          progress.processed === progress.totalTaxpayers &&
          progress.totalTaxpayers > 0
        ) {
          res.write(`event: complete\ndata: ${JSON.stringify(progress)}\n\n`);
          clearInterval(interval);
          setTimeout(() => res.end(), 1000);
          return;
        }
      } catch (error) {
        logger.error("Error streaming progress", { error });
        res.write(
          `data: ${JSON.stringify({ error: "Failed to fetch progress" })}\n\n`
        );
      }
    }, 1000);

    // Handle client disconnect
    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });
  }
);



/**
 * @description SSE endpoint for real-time company upload progress updates
 * @route GET /api/v1/auth/bulk-company-progress/:publicId
 * @access Private
 */
const BulkCompanyProgressHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { publicId } = req.params;
    const user = req.user as { userId: string };
    const { userId } = user;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    const progressKey = `bulk_company_upload_progress:${publicId}:${userId}`;
    let lastProgress: ICompanyBulkUploadProgressTracker | null = null;

    // Send initial state
    try {
      const initialProgress = await getCompanyBulkDataProgress(progressKey);
      res.write(`data: ${JSON.stringify(initialProgress)}\n\n`);
      lastProgress = initialProgress;
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: "No progress found" })}\n\n`);
    }

    const interval = setInterval(async () => {
      try {
        const progress = await getCompanyBulkDataProgress(progressKey);
        if (JSON.stringify(progress) !== JSON.stringify(lastProgress)) {
          res.write(`data: ${JSON.stringify(progress)}\n\n`);
          lastProgress = progress;
        }
        if (
          progress.processed === progress.totalBranches &&
          progress.totalBranches > 0
        ) {
          res.write(`event: complete\ndata: ${JSON.stringify(progress)}\n\n`);
          clearInterval(interval);
          setTimeout(() => res.end(), 1000);
          return;
        }
      } catch (error) {
        logger.error("Error streaming company progress", { error });
        res.write(
          `data: ${JSON.stringify({ error: "Failed to fetch progress" })}\n\n`
        );
      }
    }, 1000);

    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });
  }
);

/**
 * @description Get User Employee Upload Status
 * @route GET /api/v1/auth/bulk-taxpayer-progress/:publicId
 */
export async function getUserEmployeeUploadStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.user as { userId: string };
    const { status, page = 1, limit = 10 } = req.query;
    const query: any = { userId };
    if (status) query.status = status;
    const uploads = await UploadProgress.find(query)
      .sort({ updatedAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();
    const total = await UploadProgress.countDocuments(query);
    res.status(200).json({ data: uploads, total, page, limit });
  } catch (error: any) {
    logger.error("Failed to query Taxpayers Data:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      message: error.message,
      data: null,
      status: "error",
    });
  }
}

/**
 * @description Get Single User Employee Upload Status
 * @route GET /api/v1/auth/bulk-taxpayer-progress/:publicId
 */
export async function getSingleUserEmployeeUploadStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userId } = req.user as { userId: string };
    const { uploadId } = req.params;
    const upload = await UploadProgress.findOne({
      userId,
      _id: uploadId,
    });
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      message: "User Request Upload Status Fetched Succesfully.",
      data: upload,
      status: "success",
    });
  } catch (error: any) {
    logger.error("Failed to query User Request Data:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      message: error.message,
      data: null,
      status: "error",
    });
  }
}



export {
  RegisterUser,
  LoginUser,
  LogoutUserHandler,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
  ChangePasswordHandler,
  UploadTaxpayerCSVHandler,
  Verify2FA,
  RefreshToken,
  BulkTaxpayerProgressHandler,
  UploadExpartiateTaxpayerCSVHandler,
  UploadCompanyBranchCSVHandler,
  RestrictAccountHandler,
  UnrestrictAccountHandler,
  UploadBulkCompanyCSVHandler,
  BulkCompanyProgressHandler
};
