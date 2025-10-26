import bcrypt from "bcryptjs";
import User, { IUser, UserType } from "../models/User";
import mongoose, { FilterQuery } from "mongoose";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import {
  databaseQueryTimeHistogram,
  measureDatabaseQuery,
  trackCacheHit,
} from "../utils/metrics";
import { REDIS_TTL } from "../constants";
interface ChartDataPoint {
  date: string;
  totalUsers: number;
  individualUsers: number;
  corporateUsers: number;
}


interface UserChartData {
  totalUsers: number;
  individualUsers: number;
  corporateUsers: number;
  adminUsers: number;
  payeUsers: number;
  chartData: ChartDataPoint[];
}

/**
 * @description Get list of User Document of a also perform filtering options
 * @param queryObject FilterQuery<IUser>
 * @returns
 */
export const GetAllUserService = async (
  queryObject: FilterQuery<IUser>,
  skip: number = 0,
  limit: number = 10
): Promise<{
  users: IUser[];
  totalPages: number;
  totalCount: number;
}> => {
  const users = await measureDatabaseQuery(
    "get_all_user_service",
    () =>
      User.find(queryObject)
        .skip(skip)
        .limit(limit)
        .sort("-createdAt")
        .select("-passwordHash")
        .lean(),
    "auth"
  );

  const totalCount = await measureDatabaseQuery(
    "count_all_user",
    () => User.countDocuments(queryObject),
    "auth"
  );
  const totalPages = Math.ceil(totalCount / limit);
  return { users, totalCount, totalPages };
};

// Get A Single User Document
export const GetASingleUserService = async (
  id: string
): Promise<IUser | null> => {
  try {
    const redisKey = `user:${id}`;
    if (!id) {
      logger.error(`Invalid id`);
      throw new Error("Invalid id");
    }

    const userExists = await redisClient.get(redisKey);
    if (userExists) {
      trackCacheHit("redis", "get_single_user");
      return JSON.parse(userExists);
    }

    const user = await measureDatabaseQuery(
      "get_single_user_service",
      () => User.findOne({ _id: id }).select("-passwordHash").lean(),
      "auth"
    );

    if (!user) {
      logger.error(`User not found for ID: ${id}`, {
        data: user,
      });
      throw new Error(`User not found for ID: ${id}`);
    }
    logger.info("User details fetched sucessfully!", {
      // data: user,
    });
    await redisClient.set(redisKey, JSON.stringify(user), "EX", 3000);
    return user;
  } catch (error) {
    logger.error("GetASingleUserService: Failed to get a single user", {
      error,
    });
    throw error;
  }
};

/**
 * Updates a User document in the database
 * @param userID - TIN of the user
 * @param body - Partial user data
 * @returns Updated user document
 */
export const UpdateUserService = async (
  userID: string,
  body: Partial<IUser>
): Promise<IUser | null> => {
  logger.info("Updating user", { userID, data: Object.keys(body) });

  const { password, ...otherFields } = body;

  let updateData: Partial<IUser> = otherFields;

  if (password) {
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(password, salt);
    updateData = {
      ...otherFields,
      passwordHash: newPasswordHash,
    };
  }
  try {
    const updatedUser = await measureDatabaseQuery(
      "update_user_service",
      () =>
        User.findOneAndUpdate(
          { _id: userID },
          { $set: updateData },
          { new: true }
        )
          .lean()
          .select("-passwordHash"),
      "auth"
    );
    const redisKey = `user:${updatedUser?._id}`;

    await redisClient.setex(
      redisKey,
      REDIS_TTL,
      JSON.stringify(updatedUser?.toObject())
    );
    logger.info("User updated successfully", { _id: userID });
    return updatedUser;
  } catch (error) {
    logger.error("Error updating user", { error });
    throw error;
  }
};

/**
 * @description Service handker to delete a User
 * @param id 
 * @returns 
 */
export const DeleteUserService = async (id: string): Promise<string> => {
  const metricLabels = {
    operation: "Delete_single_user",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  await GetASingleUserService(id);
  await User.findOneAndDelete({ _id: id });
  end(metricLabels);
  return "User has been deleted";
};


/**
 * 
 * @param userId 
 * @param role 
 * @param timeFrameDays 
 * @param activeTimeFrameDays 
 * @param corporateTimeFrameDays 
 * @param individualFrameDays 
 * @returns 
 */
export const getAggregatedUserService = async (
  userId: string,
  role: string,
  timeFrameDays: number = 60,
  activeTimeFrameDays: number = 60,
  corporateTimeFrameDays: number = 60,
  individualFrameDays: number = 60
): Promise<any> => {
  const queryParameter: FilterQuery<IUser> = {};
  if (role === "MDA" || role === "COMPANY") {
    queryParameter.userId = userId;
  }

  // Calculate date ranges
  const timeFrameDate = new Date();
  timeFrameDate.setUTCDate(timeFrameDate.getUTCDate() - timeFrameDays);

  const activeTimeFrameDate = new Date();
  activeTimeFrameDate.setUTCDate(
    activeTimeFrameDate.getUTCDate() - activeTimeFrameDays
  );

  const corporateTimeFrameDate = new Date();
  corporateTimeFrameDate.setUTCDate(
    corporateTimeFrameDate.getUTCDate() - corporateTimeFrameDays
  );

  const individualTimeFrameDate = new Date();
  individualTimeFrameDate.setUTCDate(
    individualTimeFrameDate.getUTCDate() - individualFrameDays
  );

  const aggregation = await measureDatabaseQuery(
    "get_aggregated_user_service",
    () =>
      User.aggregate([
        {
          $match: {
            ...queryParameter,
            createdAt: { $gte: timeFrameDate },
          },
        },
        {
          $facet: {
            // Total users by type
            totalUsersByType: [
              {
                $group: {
                  _id: "$userType",
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  userType: "$_id",
                  count: 1,
                  _id: 0,
                },
              },
            ],
            // Active users by type
            activeUsersByType: [
              {
                $group: {
                  _id: "$userType",
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  userType: "$_id",
                  count: 1,
                  _id: 0,
                },
              },
            ],
            // Gender breakdown (total)
            totalMaleEmployees: [
              { $match: { gender: "Male" } },
              { $count: "total" },
            ],
            totalFemaleEmployees: [
              { $match: { gender: "Female" } },
              { $count: "total" },
            ],
          },
        },
        {
          $project: {
            totalIndividuals: {
              $arrayElemAt: [
                "$totalUsersByType.count",
                { $indexOfArray: ["$totalUsersByType.userType", "INDIVIDUAL"] },
              ],
            },
            totalCompanies: {
              $arrayElemAt: [
                "$totalUsersByType.count",
                { $indexOfArray: ["$totalUsersByType.userType", "COMPANY"] },
              ],
            },
            totalAdmins: {
              $arrayElemAt: [
                "$totalUsersByType.count",
                { $indexOfArray: ["$totalUsersByType.userType", "ADMIN"] },
              ],
            },
            totalUsers: { $sum: ["$totalIndividuals", "$totalCompanies"] },
          },
        },
      ]),
    "auth"
  );

  const result = aggregation[0] || {};

  logger.info("Employer tax payers aggregated successfully", {
    userId,
    timeFrameDays,
    totalEmployees: result.totalUsers || 0,
  });
  return {
    totalIndividuals: result.totalIndividuals || 0,
    totalCompanies: result.totalCompanies || 0,
    totalAdmins: result.totalAdmins || 0,
    totalMaleEmployees: result.totalMaleEmployees || 0,
    totalFemaleEmployees: result.totalFemaleEmployees || 0,
    totalUsers: result.totalUsers || 0,
  };
};

export const getUserChartDataService = async (
  userId: string,
  timeFrameDays: number,
  granularity: "day" | "week" | "month" = "day"
): Promise<UserChartData> => {
  const metricLabels = {
    operation: "get_user_chart_",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  // Validate role and timeFrameDays
  if (timeFrameDays <= 0 || timeFrameDays > 365) {
    throw new Error("Invalid timeFrameDays: Must be between 1 and 365");
  }

  // Generate cache key
  const cacheKey = `user:chart:${userId}:${timeFrameDays}:${granularity}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    logger.info("Returning cached user chart data", { cacheKey });
    return JSON.parse(cached);
  }

  // Calculate date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeFrameDays);

  // Define date format based on granularity
  const dateFormat =
    granularity === "day"
      ? "%Y-%m-%d"
      : granularity === "week"
      ? "%Y-%W"
      : "%Y-%m";

  // MongoDB aggregation pipeline
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },

    {
      $group: {
        _id: {
          date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          userType: "$userType",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        adminUsers: {
          $sum: {
            $cond: [{ $eq: ["$_id.userType", UserType.ADMIN] }, "$count", 0],
          },
        },
        chairman: {
          $sum: {
            $cond: [{ $eq: ["$_id.userType", UserType.CHAIRMAN] }, "$count", 0],
          },
        },
        paye: {
          $sum: {
            $cond: [{ $eq: ["$_id.userType", UserType.PAYE] }, "$count", 0],
          },
        },
        individualUsers: {
          $sum: {
            $cond: [
              { $eq: ["$_id.userType", UserType.INDIVIDUAL] },
              "$count",
              0,
            ],
          },
        },
        corporateUsers: {
          $sum: {
            $cond: [{ $eq: ["$_id.userType", UserType.COMPANY] }, "$count", 0],
          },
        },
      },
    },
    // {
    //   $sort: { _id: 1 },
    // },
    {
      $project: {
        date: "$_id",
        totalUsers: { $add: ["$individualUsers", "$corporateUsers"] },
        totalAdminstrators: { $add: ["$adminUsers", "$payeUsers"] },
        individualUsers: 1,
        adminUsers: 1,
        payeUsers: 1,
        corporateUsers: 1,
        _id: 0,
      },
    },
  ];

  const chartData = await measureDatabaseQuery(
    "user-chart-service",
    () => User.aggregate(pipeline).exec(),
    "auth"
  );

  // Calculate totals
  const totalUsers = chartData.reduce(
    (sum, point) => sum + point.totalUsers,
    0
  );
  const individualUsers = chartData.reduce(
    (sum, point) => sum + point.individualUsers,
    0
  );
  const corporateUsers = chartData.reduce(
    (sum, point) => sum + point.corporateUsers,
    0
  );

  const adminUsers = chartData.reduce(
    (sum, point) => sum + point.adminUsers,
    0
  );

  const payeUsers = chartData.reduce((sum, point) => sum + point.payeUsers, 0);

  const result: UserChartData = {
    totalUsers,
    individualUsers,
    corporateUsers,
    chartData,
    adminUsers,
    payeUsers,
  };

  // Cache for 5 minutes
  await redisClient.set(cacheKey, JSON.stringify(result), "EX", 300);
  logger.info("User chart data calculated and cached", { cacheKey });
  end(metricLabels);
  return result;
};
