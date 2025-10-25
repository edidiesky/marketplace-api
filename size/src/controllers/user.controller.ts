import { Response, Request } from "express";
import bcrypt from "bcrypt";
import { createObjectCsvWriter } from "csv-writer";
import fs from "fs/promises";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import asyncHandler from "express-async-handler";
import {
  DeleteUserService,
  getAgencyChartDataService,
  getAggregatedAdminUserService,
  getAggregatedAgencyService,
  getAggregatedUserService,
  GetAllUserService,
  GetASingleUserService,
  getCompanyAggregatedEmployeesService,
  getUserChartDataService,
  UpdateUserService,
} from "../services/user.service";
import User, {
  DirectorateType,
  IUser,
  Permission,
  RoleLevel,
} from "../models/User";
import { FilterQuery } from "mongoose";
import redisClient from "../config/redis";
import logger from "../utils/logger";
import { reqReplyTime, trackCacheHit } from "../utils/metrics";
import { validatePasswordStrength } from "../validators/user.validator";
import path from "path";
import moment from "moment";
import { IRole, UserRole } from "../models/Role";
import { AuthenticatedRequest } from "../types";

/**
 * @description It retrieves all Users for a  with optional filtering and pagination, cached in Redis.
 * @route GET /api/v1/Users
 * @access Private (it will need JWT authentication)
 * @param {string} req.param - The ID of the
 * @throws {Error} BAD_REQUEST_STATUS_CODE - If query parameters are invalid
 */

export const GetAllUsersHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;
    const { userId, userType: role } = user;
    // let role = userType
    const {
      page = "1",
      limit = "10",
      state,
      userType,
      lga,
      startDate,
      search,
      endDate,
      proofOfResidency,
      meansOfIdentification,
      employerTin,
      isAdmin = "false",
      directory,
    } = req.query;
    const queryObjects: FilterQuery<IUser> = {
      // directorate: { $exists: isAdminBool },
    };
    if (userType) queryObjects.userType = userType;

    if (employerTin) {
      queryObjects.employerTin = employerTin || userId;
    }

    if (role === "COMPANY") {
      queryObjects.employerTin = userId;
    }
    if (lga) queryObjects.lga = lga;
    if (state) queryObjects.state = state;
    if (proofOfResidency) queryObjects.proofOfResidency = proofOfResidency;
    if (meansOfIdentification)
      queryObjects.meansOfIdentification = meansOfIdentification;
    if (startDate)
      queryObjects.createdAt = {
        $gte: new Date(startDate as string),
      };
    if (endDate && startDate)
      queryObjects.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };

    if (search) {
      queryObjects.$or = [
        { tin: { $regex: search, $options: "i" } },
        { nin: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { agencyName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { contactFirstName: { $regex: search, $options: "i" } },
        { contactPhone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { contactEmail: { $regex: search, $options: "i" } },
        { cacNumber: { $regex: search, $options: "i" } },
        { proofOfResidency: { $regex: search, $options: "i" } },
      ];
    }

    if (directory) {
      queryObjects.directorate = directory;
    }

    const parsedLimit = Number(limit) || 10;
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    logger.info("Query Search paramter:", queryObjects);
    const userRedisKey = `redis:user:${userId}:${JSON.stringify({
      ...queryObjects,
      skip,
      limit,
    })}`;
    // CHECK FOR CACHE HIT
    const cachedUserData = await redisClient.get(userRedisKey);

    if (cachedUserData) {
      logger.info("Users Redis cache hit:", {
        userRedisKey,
      });
      trackCacheHit("redis", "get_all_user");
      res
        .status(SUCCESSFULLY_FETCHED_STATUS_CODE)
        .json(JSON.parse(cachedUserData));
      return;
    }
    const { users, totalCount, totalPages } = await GetAllUserService(
      queryObjects,
      skip,
      parsedLimit
    );
    const result = {
      data: users,
      pagination: {
        totalCount,
        totalPages,
        limit: parsedLimit,
        page: parsedPage,
      },
    };
    logger.info("User Redis cache miss:", {
      userRedisKey,
    });
    await redisClient.set(userRedisKey, JSON.stringify(result), "EX", 3600);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(result);
  }
);

/**
 * @description Download Taxpayer CSV Data
 */
export const DownloadTaxPayerRecordAsCSV = asyncHandler(
  async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const { userId, directorates, permissions } = user;
    const {
      userType,
      startDate,
      endDate,
      employerTin,
      page = "1",
      limit = "10",
    } = req.query;

    const queryObjects: FilterQuery<IUser> = {};
    if (userType) queryObjects.userType = userType;
    const parsedLimit = Number(limit) || 10;
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    if (employerTin) {
      queryObjects.employerTin = employerTin || userId;
    } else {
      if (directorates.includes(DirectorateType.TAXPAYER)) {
        queryObjects.employerTin = userId;
      }
      // if (role === "COMPANY") {
      //   queryObjects.employerTin = userId;
      // }
    }
    if (startDate)
      queryObjects.createdAt = {
        $gte: new Date(startDate as string),
      };
    if (endDate && startDate)
      queryObjects.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    logger.info("Query Search parameter:", queryObjects);

    // Fetch user
    const { users } = await GetAllUserService(queryObjects, skip, parsedLimit);

    if (!users.length) {
      res.status(404);
      throw new Error("No users found for the given criteria");
    }

    // Defining file path
    const filePath = path.join("/tmp", `users-${Date.now()}.csv`);

    // Define CSV structure
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "firstName", title: "First Name" },
        { id: "lastName", title: "Last Name" },
        { id: "userType", title: "Category" },
        { id: "tin", title: "TAXPAYER ID" },
        { id: "email", title: "Email" },
        { id: "nin", title: "NIN" },
        { id: "gender", title: "Gender" }, //  employmentStatus
        { id: "employmentStatus", title: "Employment Status" },
        { id: "employerTin", title: "Employer Tin" },
        { id: "employerName", title: "Employer Name" },
        { id: "phone", title: "Phone" },
        { id: "state", title: "State" },
        { id: "lga", title: "Local Government" },
        { id: "nationality", title: "Nationality" },
        { id: "createdAt", title: "Created At" },
      ],
    });

    // Prepare records for CSV
    const records = users.map((user: IUser) => {
      return {
        firstName: user?.firstName,
        lastName: user?.lastName,
        userType: user?.userType,
        tin: user?.tin,
        email: user?.email,
        nin: user?.nin,
        gender: user?.gender,
        employerTin: user?.employerTin || "N/A",
        employmentStatus: user?.employmentStatus || "N/A",
        employerName: user?.employerName,
        phone: user?.phone,
        state: user?.state,
        lga: user?.lga,
        nationality: user?.nationality,
        createdAt: moment(user.createdAt).format("DD MMM YYYY"),
      };
    });

    try {
      // Write to CSV
      await csvWriter.writeRecords(records);
      logger.info("CSV file written successfully", { filePath });

      // Verify file exists
      await fs.access(filePath);

      // Stream the CSV as a download
      res.header("Content-Type", "text/csv");
      res.header(
        "Content-Disposition",
        'attachment; filename="employee_list_${userId}_${Date.now()}.csv'
      );
      res.download(filePath, "users.csv", async (err) => {
        if (err) {
          logger.error("Error sending CSV file", { error: err });
          res.status(500).json({ message: "Error generating CSV" });
        } else {
          logger.info("CSV file downloaded successfully", { filePath });
        }
        // Clean up the file
        try {
          await fs.unlink(filePath);
          logger.info("Temporary CSV file deleted", { filePath });
        } catch (unlinkErr) {
          logger.error("Error deleting temporary CSV file", {
            error: unlinkErr,
          });
        }
      });
    } catch (error) {
      logger.error("Error generating CSV file", { error });
      res.status(500).json({ message: "Error generating CSV" });
    }
  }
);

/**
 *
 * @description It gets a single User by ID.
 * @route GET /Users/:id
 * @access Private (it will need JWT authentication)
 * @param {string} req.params.id - The TIN ID of the User to fetch
 */
export const GetSingleUsersHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await GetASingleUserService(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(user);
  }
);

/**
 * @description It Updates an existing User by ID.
 * @route PUT /Users/:id
 * @access Private (it will need JWT authentication)
 * @param {string} req.params.id - The ID of the User to update
 * @param {object} req.body - Updated User details
 */
export const UpdateUserHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params; // TIN
    const user = (req as AuthenticatedRequest).user;
    const { userId, directorates, permissions } = user;
    const { currentPassword, newPassword, confirmPassword, ...otherFields } =
      req.body;

    logger.info("User update requested", { userId, id });

    const existingUser = await User.findOne({ tin: id });
    if (!existingUser) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("User not found");
    }

    // Ensure passwordHash exists
    if (!existingUser.passwordHash) {
      logger.error("User missing passwordHash", { tin: id });
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("User account is misconfigured. Contact support.");
    }

    // Restrict updates to authorized user or admin
    if (
      userId !== id &&
      directorates.includes(DirectorateType.ICT) &&
      directorates.includes(DirectorateType.CHAIRMAN)
    ) {
      res.status(403);
      throw new Error("Unauthorized to update this user");
    }

    // Handle password update
    if (currentPassword || newPassword || confirmPassword) {
      // Ensure all password fields are provided
      if (!currentPassword || !newPassword || !confirmPassword) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error(
          "Current password, new password, and confirmation are required"
        );
      }

      // Verify current password
      try {
        const isValidCurrentPassword = await bcrypt.compare(
          currentPassword,
          existingUser.passwordHash
        );
        if (!isValidCurrentPassword) {
          res.status(BAD_REQUEST_STATUS_CODE);
          throw new Error("Invalid current password");
        }
      } catch (error) {
        logger.error("Bcrypt comparison error", { error });
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error("Error verifying current password");
      }

      // Check if new password is same as current
      try {
        const isSamePassword = await bcrypt.compare(
          newPassword,
          existingUser.passwordHash
        );
        if (isSamePassword) {
          res.status(BAD_REQUEST_STATUS_CODE);
          throw new Error(
            "New password cannot be the same as the current password"
          );
        }
      } catch (error) {
        logger.error("Bcrypt same-password check error", { error });
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error("Error validating new password");
      }

      // Validate new password strength
      const passwordError = validatePasswordStrength(newPassword);
      if (passwordError) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error(passwordError);
      }

      // Confirm new password matches
      if (newPassword !== confirmPassword) {
        res.status(BAD_REQUEST_STATUS_CODE);
        throw new Error("New password and confirmation do not match");
      }
    }

    // Update user
    const updateData: Partial<IUser> = {
      ...otherFields,
      ...(newPassword && { password: newPassword }),
    };

    const updatedUser = await UpdateUserService(id, updateData);
    if (!updatedUser) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Failed to update user");
    }

    // Invalidate cache
    await redisClient.del(`user:${id}`);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(updatedUser);
  }
);

/**
 * @description It deletes a User by ID.
 * @route DELETE /Users/:id
 * @access Private (it will need JWT authentication)
 * @param {string} req.params.id - The ID of the User to delete
 * @param {string} req.user.userId - User ID from JWT token
 * @returns {object} SUCCESSFULLY_FETCHED_STATUS_CODE - Success message
 * @throws {Error} BAD_REQUEST_STATUS_CODE - If User does not exist
 */
export const DeleteUserHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).user.userId;
    const existingUser = await GetASingleUserService(id);
    if (!existingUser) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("User not found");
    }
    const message = await DeleteUserService(id);
    await redisClient.del(`User:${userId}:${id}`); // Invalidating the  cache since we are removing a User
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ message });
  }
);

/**
 *
 * @description It retrieves all Users for a  with optional filtering and pagination, cached in Redis.
 * @route GET /api/v1/Users
 * @access Private
 */

export const GetAggregatedUserHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const startTime = process.hrtime();
    const user = (req as AuthenticatedRequest).user;
    const { userId, directorates, userType } = user;
    const role = userType;
    const {
      timeFrameDays = "60",
      activeTimeFrameDays = "60",
      corporateTimeFrameDays = "60",
      individualFrameDays = "60",
      chartGranularity = "day",
    } = req.query;

    const {
      totalAdmin,
      totalCompanies,
      totalIndividuals,
      totalMaleEmployees,
      totalFemaleEmployees,
      totalUsers,
    } = await getAggregatedUserService(
      userId,
      role,
      Number(timeFrameDays),
      Number(activeTimeFrameDays),
      Number(corporateTimeFrameDays),
      Number(individualFrameDays)
    );
    const chartData = await getUserChartDataService(
      userId,
      Number(timeFrameDays),
      chartGranularity as "day" | "week" | "month"
    );
    await reqReplyTime(req, res, startTime);
    const [seconds, nanoseconds] = process.hrtime(startTime);
    logger.info("Get aggregated user handler execution time:", {
      duration: `${seconds}seconds ${nanoseconds / 1e6}millis`,
    });
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      totalUsers,
      totalIndividuals,
      totalCompanies,
      totalAdmin,
      totalMaleEmployees,
      totalFemaleEmployees,
      chartData: {
        totalUsers: chartData.totalUsers,
        individualUsers: chartData.individualUsers,
        corporateUsers: chartData.corporateUsers,
        series: chartData.chartData,
      },
      duration: `${seconds}seconds ${nanoseconds / 1e6}millis`,
    });
  }
);

export const GetAggregatedAdminHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const startTime = process.hrtime();
    const user = (req as AuthenticatedRequest).user;
    const { userId, userType } = user;
    const role = userType;
    const {
      timeFrameDays = "60",
      activeTimeFrameDays = "60",
      payeTimeFrameDays = "60",
      ictFrameDays = "60",
      chartGranularity = "day",
    } = req.query;

    const {
      totalAdministrators,
      totalICT,
      totalAGENT,
      totalPAYE,
      totalASSESSMENT,
      totalCHANGE,
      totalCHAIRMAN,
    } = await getAggregatedAdminUserService(
      userId,
      role,
      Number(timeFrameDays),
      Number(activeTimeFrameDays),
      Number(payeTimeFrameDays),
      Number(ictFrameDays)
    );
    // const chartData = await getUserChartDataService(
    //   userId,
    //   Number(timeFrameDays),
    //   chartGranularity as "day" | "week" | "month"
    // );
    await reqReplyTime(req, res, startTime);
    const [seconds, nanoseconds] = process.hrtime(startTime);
    logger.info("Get aggregated user handler execution time:", {
      duration: `${seconds}seconds ${nanoseconds / 1e6}millis`,
    });
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      totalAdministrators,
      totalICT,
      totalAGENT,
      totalASSESSMENT,
      totalPAYE,
      totalCHANGE,
      totalCHAIRMAN,
      duration: `${seconds}seconds ${nanoseconds / 1e6}millis`,
    });
  }
);

/**
 * @description It retrieves all Users for a  with optional filtering and pagination, cached in Redis.
 * @route GET /api/v1/Users
 * @access Private
 */

export const GetAggregatedCompanyEmployeesHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const startTime = process.hrtime();
    const user = (req as AuthenticatedRequest).user;
    const userId = user.userId;

    const { timeFrameDays = "60" } = req.query;

    const {
      totalEmployees,
      totalMaleEmployees,
      totalFemaleEmployees,
      totalActiveUser,
    } = await getCompanyAggregatedEmployeesService(
      Number(timeFrameDays),
      userId
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      totalEmployees,
      totalMaleEmployees,
      totalFemaleEmployees,
      totalActiveUser,
    });
  }
);


export const GetAggregatedAgencyHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const startTime = process.hrtime();
    const user = (req as AuthenticatedRequest).user;
    const { userId, userType } = user;
    const role = userType;
    const {
      timeFrameDays = "60",
      chartGranularity = "day",
    } = req.query;

    // Validate role (restrict to admin-like roles)
    if (!["SUPERADMIN", "ADMIN", "AKIRS"].includes(role)) {
      res.status(403);
      throw new Error("Unauthorized: Only admin users can access agency aggregation");
    }

    // Fetch aggregated agency data
    const {
      totalAgencies,
      totalFederal,
      totalState,
      totalLocalGovt,
    } = await getAggregatedAgencyService(
      userId,
      role,
      Number(timeFrameDays)
    );

    // Fetch chart data
    const chartData = await getAgencyChartDataService(
      userId,
      Number(timeFrameDays),
      chartGranularity as "day" | "week" | "month"
    );

    // Log request timing
    await reqReplyTime(req, res, startTime);
    const [seconds, nanoseconds] = process.hrtime(startTime);
    logger.info("Get aggregated agency handler execution time:", {
      duration: `${seconds}seconds ${nanoseconds / 1e6}millis`,
      userId,
      role,
    });

    // Send response
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      totalAgencies,
      totalFederal,
      totalState,
      totalLocalGovt,
      chartData: {
        totalAgencies: chartData.totalAgencies,
        totalFederal: chartData.totalFederal,
        totalState: chartData.totalState,
        totalLocalGovt: chartData.totalLocalGovt,
        series: chartData.chartData,
      },
      duration: `${seconds}seconds ${nanoseconds / 1e6}millis`,
    });
  }
);

