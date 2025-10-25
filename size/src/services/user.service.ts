import { formatAmountWithSuffix } from "../utils/formatAmount";
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
import { AgencyAggregationResult, AgencyChartData } from "../types";
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
 * @param skip number
 * @param limit number
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
      () => User.findOne({ tin: id }).select("-passwordHash").lean(),
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

// Update a User Document

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

  // Hash new password if provided
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
          { tin: userID },
          { $set: updateData },
          { new: true }
        )
          .lean()
          .select("-passwordHash"),
      "auth"
    );
    const redisKey = `user:${updatedUser?.tin}`;

    await redisClient.setex(
      redisKey,
      REDIS_TTL,
      JSON.stringify(updatedUser?.toObject())
    );
    logger.info("User updated successfully", { tin: userID });
    return updatedUser;
  } catch (error) {
    logger.error("Error updating user", { error });
    throw error;
  }
};

// Delete a IUser
export const DeleteUserService = async (id: string): Promise<string> => {
  const metricLabels = {
    operation: "Delete_single_user",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  await GetASingleUserService(id);
  await User.findOneAndDelete({ tin: id });
  end(metricLabels);
  return "User has been deleted";
};

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

export const getAggregatedAdminUserService = async (
  userId: string,
  role: string,
  timeFrameDays: number = 60,
  activeTimeFrameDays: number = 60,
  corporateTimeFrameDays: number = 60,
  individualFrameDays: number = 60
): Promise<any> => {
  const metricLabels = {
    operation: "get_aggregated_user",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  const queryParameter: FilterQuery<IUser> = {};

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
    "get_aggregated_admin_service",
    () =>
      User.aggregate([
        {
          $match: {
            ...queryParameter,
            createdAt: { $gte: timeFrameDate },
            $or: [
              { userType: "ADMIN" },
              { userType: "SUPERADMIN" },
              { userType: "AGENT" },
              { userType: "PAYE" },
              { userType: "ASSESSMENT" },
            ],
          },
        },
        {
          $group: {
            _id: "$directorate",
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: null,
            directorates: {
              $push: {
                directorate: "$_id",
                count: "$count",
              },
            },
            totalUsers: { $sum: "$count" },
          },
        },
        {
          $project: {
            _id: 0,
            totalUsers: 1,
            totalICT: {
              $let: {
                vars: {
                  ictDoc: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$directorates",
                          cond: { $eq: ["$$this.directorate", "ICT"] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ["$$ictDoc.count", 0] },
              },
            },
            totalAGENT: {
              $let: {
                vars: {
                  agentDoc: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$directorates",
                          cond: { $eq: ["$$this.directorate", "AGENT"] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ["$$agentDoc.count", 0] },
              },
            },
            totalPAYE: {
              $let: {
                vars: {
                  payeDoc: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$directorates",
                          cond: { $eq: ["$$this.directorate", "PAYE"] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ["$$payeDoc.count", 0] },
              },
            },
            totalASSESSMENT: {
              $let: {
                vars: {
                  assessmentDoc: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$directorates",
                          cond: { $eq: ["$$this.directorate", "ASSESSMENT"] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ["$$assessmentDoc.count", 0] },
              },
            },
            totalCHANGE: {
              $let: {
                vars: {
                  changeDoc: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$directorates",
                          cond: { $eq: ["$$this.directorate", "CHANGE"] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ["$$changeDoc.count", 0] },
              },
            },
            totalCHAIRMAN: {
              $let: {
                vars: {
                  chairmanDoc: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$directorates",
                          cond: { $eq: ["$$this.directorate", "CHAIRMAN"] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ["$$chairmanDoc.count", 0] },
              },
            },
            totalBOARDS: {
              $let: {
                vars: {
                  boardsDoc: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$directorates",
                          cond: { $eq: ["$$this.directorate", "BOARDS"] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ["$$boardsDoc.count", 0] },
              },
            },
          },
        },
      ]),
    "auth"
  );
  const result = aggregation[0] || {
    totalUsers: 0,
    totalICT: 0,
    totalAGENT: 0,
    totalPAYE: 0,
    totalASSESSMENT: 0,
    totalCHANGE: 0,
    totalCHAIRMAN: 0,
    totalBOARDS: 0,
  };

  logger.info("Administrators has been aggregated successfully", {
    userId,
    timeFrameDays,
    totalAdministrators: result.totalUsers || 0,
  });

  metricLabels.success = "true";
  end(metricLabels);

  return {
    totalICT: result.totalICT || 0,
    totalAGENT: result.totalAGENT || 0,
    totalPAYE: result.totalPAYE || 0,
    totalASSESSMENT: result.totalASSESSMENT || 0,
    totalCHANGE: result.totalCHANGE || 0,
    totalCHAIRMAN: result.totalCHAIRMAN || 0,
    totalBOARDS: result.totalBOARDS || 0,
    totalAdministrators: result.totalUsers || 0,
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

export const getCompanyAggregatedEmployeesService = async (
  timeFrameDays: number = 60,
  userId: string
) => {
  /**
   * Group by Male, Female, Total Employees, Total Uploads:
   */

  const metricLabels = {
    operation: "get_aggregated_company_employees",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const timeFrameDate = new Date();
    const currTimeFrameDate = timeFrameDate.getUTCDate();
    timeFrameDate.setUTCDate(currTimeFrameDate - timeFrameDays);
    const queryParameter: FilterQuery<IUser> = {
      // userType: "COMPANY",
      createdAt: { $gte: timeFrameDate },
      employerTin: userId,
    };
    const aggregationResult = await User.aggregate([
      {
        $match: queryParameter,
      },
      {
        $facet: {
          totalEmployees: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
          totalMaleEmployees: [
            {
              $match: { gender: "MALE" },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
          totalFemaleEmployees: [
            {
              $match: { gender: "FEMALE" },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    // Step 5: Extract results
    const totalEmployees = aggregationResult[0].totalEmployees[0]?.count || 0;
    const totalMaleEmployees =
      aggregationResult[0].totalMaleEmployees[0]?.count || 0;
    const totalFemaleEmployees =
      aggregationResult[0].totalFemaleEmployees[0]?.count || 0;

    logger.info("Employer's tax payers have been successfully aggregated!", {
      totalEmployees,
      totalMaleEmployees,
      totalFemaleEmployees,
    });

    end(metricLabels);

    return {
      totalEmployees: formatAmountWithSuffix(totalEmployees),
      totalMaleEmployees: formatAmountWithSuffix(totalMaleEmployees),
      totalFemaleEmployees: formatAmountWithSuffix(totalFemaleEmployees),
      totalActiveUser: formatAmountWithSuffix(totalEmployees),
    };
  } catch (error: any) {
    logger.error("Failed to aggregate employer's tax payers", {
      error: error.message,
    });
    end({ ...metricLabels, success: "false" });
    throw error;
  }
};

/**
 * @description Get all Agency Aggregated Data
 */

/**
 * Aggregates agency users (FEDERAL, STATE, LOCALGOVT) by userType within a timeframe.
 * @param userId - ID of the requesting user
 * @param role - Role of the requesting user
 * @param timeFrameDays - Number of days to look back for aggregation
 * @returns Aggregated counts of agencies by userType
 */
export const getAggregatedAgencyService = async (
  userId: string,
  role: string,
  timeFrameDays: number = 60
): Promise<AgencyAggregationResult> => {
  const metricLabels = {
    operation: "get_aggregated_agency",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  const queryParameter: FilterQuery<IUser> = {};

  // Validate timeFrameDays
  if (timeFrameDays <= 0 || timeFrameDays > 365) {
    throw new Error("Invalid timeFrameDays: Must be between 1 and 365");
  }

  // Calculate date range
  const timeFrameDate = new Date();
  timeFrameDate.setUTCDate(timeFrameDate.getUTCDate() - timeFrameDays);

  // Aggregation pipeline
  const aggregation = await measureDatabaseQuery(
    "get_aggregated_agency_service",
    () =>
      User.aggregate([
        {
          $match: {
            ...queryParameter,
            createdAt: { $gte: timeFrameDate },
            userType: {
              $in: [UserType.FEDERAL, UserType.STATE, UserType.LOCALGOVT],
            },
          },
        },
        {
          $group: {
            _id: "$userType",
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: null,
            userTypes: {
              $push: {
                userType: "$_id",
                count: "$count",
              },
            },
            totalAgencies: { $sum: "$count" },
          },
        },
        {
          $project: {
            _id: 0,
            totalAgencies: 1,
            totalFederal: {
              $let: {
                vars: {
                  federalDoc: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$userTypes",
                          cond: { $eq: ["$$this.userType", UserType.FEDERAL] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ["$$federalDoc.count", 0] },
              },
            },
            totalState: {
              $let: {
                vars: {
                  stateDoc: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$userTypes",
                          cond: { $eq: ["$$this.userType", UserType.STATE] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ["$$stateDoc.count", 0] },
              },
            },
            totalLocalGovt: {
              $let: {
                vars: {
                  localGovtDoc: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$userTypes",
                          cond: {
                            $eq: ["$$this.userType", UserType.LOCALGOVT],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ["$$localGovtDoc.count", 0] },
              },
            },
          },
        },
      ]),
    "auth"
  );

  const result = aggregation[0] || {
    totalAgencies: 0,
    totalFederal: 0,
    totalState: 0,
    totalLocalGovt: 0,
  };

  logger.info("Agencies aggregated successfully", {
    userId,
    role,
    timeFrameDays,
    totalAgencies: result.totalAgencies || 0,
  });

  metricLabels.success = "true";
  end(metricLabels);

  return {
    totalAgencies: result.totalAgencies || 0,
    totalFederal: result.totalFederal || 0,
    totalState: result.totalState || 0,
    totalLocalGovt: result.totalLocalGovt || 0,
  };
};

/**
 * Retrieves chart data for agency registrations over a specified timeframe.
 * @param userId - ID of the requesting user
 * @param timeFrameDays - Number of days to look back
 * @param granularity - Time granularity (day, week, month)
 * @returns Chart data with agency counts
 */
export const getAgencyChartDataService = async (
  userId: string,
  timeFrameDays: number,
  granularity: "day" | "week" | "month" = "day"
): Promise<AgencyChartData> => {
  const metricLabels = {
    operation: "get_agency_chart_data",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();

  // Validate inputs
  if (timeFrameDays <= 0 || timeFrameDays > 365) {
    throw new Error("Invalid timeFrameDays: Must be between 1 and 365");
  }

  // Generate cache key
  const cacheKey = `agency:chart:${userId}:${timeFrameDays}:${granularity}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    logger.info("Returning cached agency chart data", { cacheKey });
    return JSON.parse(cached);
  }

  // Calculate date range
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - timeFrameDays);

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
        userType: {
          $in: [UserType.FEDERAL, UserType.STATE, UserType.LOCALGOVT],
        },
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
        federalAgencies: {
          $sum: {
            $cond: [{ $eq: ["$_id.userType", UserType.FEDERAL] }, "$count", 0],
          },
        },
        stateAgencies: {
          $sum: {
            $cond: [{ $eq: ["$_id.userType", UserType.STATE] }, "$count", 0],
          },
        },
        localGovtAgencies: {
          $sum: {
            $cond: [
              { $eq: ["$_id.userType", UserType.LOCALGOVT] },
              "$count",
              0,
            ],
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
        totalAgencies: {
          $add: ["$federalAgencies", "$stateAgencies", "$localGovtAgencies"],
        },
        federalAgencies: 1,
        stateAgencies: 1,
        localGovtAgencies: 1,
        _id: 0,
      },
    },
  ];

  const chartData = await measureDatabaseQuery(
    "agency-chart-service",
    () => User.aggregate(pipeline).exec(),
    "auth"
  );

  // Calculate totals
  const totalAgencies = chartData.reduce(
    (sum, point) => sum + point.totalAgencies,
    0
  );
  const totalFederal = chartData.reduce(
    (sum, point) => sum + point.federalAgencies,
    0
  );
  const totalState = chartData.reduce(
    (sum, point) => sum + point.stateAgencies,
    0
  );
  const totalLocalGovt = chartData.reduce(
    (sum, point) => sum + point.localGovtAgencies,
    0
  );

  const result: AgencyChartData = {
    totalAgencies,
    totalFederal,
    totalState,
    totalLocalGovt,
    chartData,
  };

  // Cache for 5 minutes
  await redisClient.set(cacheKey, JSON.stringify(result), "EX", 300);
  logger.info("Agency chart data calculated and cached", { cacheKey });
  end(metricLabels);
  return result;
};
