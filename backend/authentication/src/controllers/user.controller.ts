import { Response, Request } from "express";
import bcrypt from "bcrypt";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import asyncHandler from "express-async-handler";
import {
  DeleteUserService,
  getAggregatedUserService,
  GetAllUserService,
  GetASingleUserService,
  getUserChartDataService,
  UpdateUserService,
} from "../services/user.service";
import User, { IUser, Permission, RoleLevel } from "../models/User";
import { FilterQuery } from "mongoose";
import redisClient from "../config/redis";
import logger from "../utils/logger";
import { reqReplyTime, trackCacheHit } from "../utils/metrics";
import { validatePasswordStrength } from "../validators/user.validator";
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
    const { userId, role } = user;
    // let role = role
    const {
      page = "1",
      limit = "10",
      userType,
      startDate,
      search,
      endDate,
      directory,
    } = req.query;
    const queryObjects: FilterQuery<IUser> = {};
    if (userType) queryObjects.role = userType;
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
        { firstName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
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
 *
 * @description It gets a single User by ID.
 * @route GET /Users/:id
 * @access Private (it will need JWT authentication)
 * @param {string} req.params.id - The ID of the User to fetch
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
    const { id } = req.params; //
    const user = (req as AuthenticatedRequest).user;
    const { userId, permissions } = user;
    const { currentPassword, newPassword, confirmPassword, ...otherFields } =
      req.body;

    logger.info("User update requested", { userId, id });

    const existingUser = await User.findOne({ _id: id });
    if (!existingUser) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("User not found");
    }

    // Ensure passwordHash exists
    if (!existingUser.passwordHash) {
      logger.error("User missing passwordHash", { _id: id });
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("User account is misconfigured. Contact support.");
    }

    // Restrict updates to authorized user or admin
    if (userId !== id) {
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
    const { userId, role } = user;
    const {
      timeFrameDays = "60",
      activeTimeFrameDays = "60",
      corporateTimeFrameDays = "60",
      individualFrameDays = "60",
      chartGranularity = "day",
    } = req.query;

    const {
      totalIndividuals,
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
      chartData: {
        totalUsers: chartData.totalUsers,
        customerUsers: chartData.customer,
        sellers: chartData.sellers,
        series: chartData.chartData,
      },
      duration: `${seconds}seconds ${nanoseconds / 1e6}millis`,
    });
  }
);
