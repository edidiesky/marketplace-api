import { formatAmountWithSuffix } from "../utils/formatAmount";
import MDAs, { IMDA } from "../models/MDAs";
import mongoose, { FilterQuery } from "mongoose";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import { databaseQueryTimeHistogram } from "../utils/metrics";
interface ChartDataPoint {
  date: string;
  totalMDAs: number;
  individualMDAs: number;
  corporateMDAs: number;
}

/**
 * @description Get list of MDAs Document of a  also perform filtering options
 * @param queryObject FilterQuery<IMDA>
 * @param skip number
 * @param limit number
 * @returns
 */
export const GetAllMDAService = async (
  queryObject: FilterQuery<IMDA>,
  skip: number = 0,
  limit: number = 10
): Promise<{
  mDAs: IMDA[];
  totalPages: number;
  totalCount: number;
}> => {
  const metricLabels = {
    operation: "get_all_MDA",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  // const redisMDAKey = `MDAs:${JSON.stringify({
  //   ...queryObject,
  //   skip,
  //   limit,
  // })}`;
  // const cachedMDAs = await redisClient.get(redisMDAKey);
  // if (cachedMDAs) {
  //   return JSON.parse(cachedMDAs);
  // }
  const mDAs = await MDAs.find(queryObject)
    .skip(skip)
    .limit(limit)
    .sort("-createdAt")
    .lean();

  const totalCount = await MDAs.countDocuments(queryObject);
  const totalPages = Math.ceil(totalCount / limit);

  // await redisClient.set(
  //   redisMDAKey,
  //   JSON.stringify(MDAs),
  //   "EX",
  //   3600
  // );
  end(metricLabels);
  return { mDAs, totalCount, totalPages };
};

// Get A Single MDAs Document
export const GetASingleMDAService = async (
  id: string
): Promise<IMDA | null> => {
  const metricLabels = {
    operation: "get_single_MDA",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const redisKey = `MDA:${id}`;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      logger.error(`Invalid id`);
      throw new Error("Invalid id");
    }

    const MDAExists = await redisClient.get(redisKey);
    if (MDAExists) {
      return JSON.parse(MDAExists);
    }

    const MDA = await MDAs.findById(id).lean();
    if (!MDA) {
      logger.error(`MDAs not found for ID: ${id}`, {
        data: MDA,
      });
      throw new Error(`MDAs not found for ID: ${id}`);
    }
    logger.info("MDAs details fetched sucessfully!", {
      // data: MDA,
    });
    await redisClient.set(redisKey, JSON.stringify(MDA), "EX", 3000);
    end(metricLabels);
    return MDA;
  } catch (error) {
    logger.error("GetASingleMDAService: Failed to get a single MDA", {
      error,
    });
    end({
      ...metricLabels,
      success: "false",
    });
    throw error;
  }
};

// Update a MDAs Document
export const UpdateMDAService = async (
  MDAID: string,
  body: Partial<IMDA>
): Promise<IMDA | null | string> => {
  logger.info("MDAs Payment Status Data:", {
    data: body,
  });

  const metricLabels = {
    operation: "update_single_MDA",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  await GetASingleMDAService(MDAID);

  const updatedMDA = await MDAs.findOneAndUpdate({ _id: MDAID }, body, {
    new: true,
  }).lean();
  logger.info("MDAs payment updated succesfully!");
  end(metricLabels);
  return updatedMDA;
};

// Delete a IMDA
export const DeleteMDAService = async (id: string): Promise<string> => {
  const metricLabels = {
    operation: "Delete_single_MDA",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  await GetASingleMDAService(id);
  await MDAs.findByIdAndDelete(id);
  end(metricLabels);
  return "MDAs has been deleted";
};

export const getAggregatedMDAService = async (
  MDAId: string,
  role: string,
  timeFrameDays: number = 60,
  activeTimeFrameDays: number = 60,
  corporateTimeFrameDays: number = 60,
  individualFrameDays: number = 60
): Promise<any> => {
  const metricLabels = {
    operation: "get_aggregated_MDA",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  const queryParameter: FilterQuery<IMDA> = {};
  if (role === "INDIVIDUAL" || role === "COMPANY") {
    queryParameter.MDAId = MDAId;
  }

  // Total active MDAs
  const timeFrameDate = new Date();
  const currTimeFrameDate = timeFrameDate.getUTCDate();
  timeFrameDate.setUTCDate(currTimeFrameDate - timeFrameDays);

  // Total active MDAs
  const activeTimeFrameDate = new Date();
  const curractiveTimeFrameDate = activeTimeFrameDate.getUTCDate();
  activeTimeFrameDate.setUTCDate(curractiveTimeFrameDate - activeTimeFrameDays);

  // Total COMPANY active MDAs
  const corporateTimeFrameDate = new Date();
  const currcorporateTimeFrameDate = corporateTimeFrameDate.getUTCDate();
  corporateTimeFrameDate.setUTCDate(
    currcorporateTimeFrameDate - corporateTimeFrameDays
  );

  const individualTimeFrameDate = new Date();
  const currindividualTimeFrameDate = individualTimeFrameDate.getUTCDate();
  individualTimeFrameDate.setUTCDate(
    currindividualTimeFrameDate - individualFrameDays
  );

  const aggregation = await MDAs.aggregate([
    {
      $match: {
        ...queryParameter,
        createdAt: { $gte: timeFrameDate },
      },
    },
    {
      $facet: {
        totalEmployees: [{ $count: "total" }],
        totalMaleEmployees: [
          { $match: { gender: "Male" } },
          { $count: "total" },
        ],
        totalFemaleEmployees: [
          { $match: { gender: "Female" } },
          { $count: "total" },
        ],
        totalActiveMDAs: [
          { $match: { status: "active" } }, // Adjust based on your schema
          { $count: "total" },
        ],
      },
    },
  ]);

  logger.info("Employer tax payers aggregated successfully", {
    MDAId,
    timeFrameDays,
    totalEmployees: aggregation[0].totalEmployees[0]?.total || 0,
  });

  metricLabels.success = "true";
  end(metricLabels);

  return {
    totalEmployees: formatAmountWithSuffix(
      aggregation[0].totalEmployees[0]?.total || 0
    ),
    totalMaleEmployees: formatAmountWithSuffix(
      aggregation[0].totalMaleEmployees[0]?.total || 0
    ),
    totalFemaleEmployees: formatAmountWithSuffix(
      aggregation[0].totalFemaleEmployees[0]?.total || 0
    ),
    totalActiveMDAs: formatAmountWithSuffix(
      aggregation[0].totalActiveMDAs[0]?.total || 0
    ),
  };
};

// export const getMDAChartDataService = async (
//   MDAId: string,
//   role: string,
//   timeFrameDays: number,
//   granularity: "day" | "week" | "month" = "day"
// ): Promise<MDAChartData> => {
//   const metricLabels = {
//     operation: "get_MDA_chart_",
//     success: "true",
//   };
//   const end = databaseQueryTimeHistogram.startTimer();
//   // Validate role and timeFrameDays
//   if (!["ADMIN"].includes(role)) {
//     throw new Error("Unauthorized: Only admins can access MDA chart data");
//   }
//   if (timeFrameDays <= 0 || timeFrameDays > 365) {
//     throw new Error("Invalid timeFrameDays: Must be between 1 and 365");
//   }

//   // Generate cache key
//   const cacheKey = `MDA:chart:${MDAId}:${timeFrameDays}:${granularity}`;
//   const cached = await redisClient.get(cacheKey);
//   if (cached) {
//     logger.info("Returning cached MDA chart data", { cacheKey });
//     return JSON.parse(cached);
//   }

//   // Calculate date range
//   const startDate = new Date();
//   startDate.setDate(startDate.getDate() - timeFrameDays);

//   // Define date format based on granularity
//   const dateFormat =
//     granularity === "day"
//       ? "%Y-%m-%d"
//       : granularity === "week"
//       ? "%Y-%W"
//       : "%Y-%m";

//   // MongoDB aggregation pipeline
//   const pipeline = [
//     {
//       $match: {
//         createdAt: { $gte: startDate },
//       },
//     },
//     {
//       $group: {
//         _id: {
//           date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
//           MDAType: "$MDAType",
//         },
//         count: { $sum: 1 },
//       },
//     },
//     {
//       $group: {
//         _id: "$_id.date",
//         totalMDAs: { $sum: "$count" },
//         individualMDAs: {
//           $sum: {
//             $cond: [
//               { $eq: ["$_id.MDAType", MDAType.INDIVIDUAL] },
//               "$count",
//               0,
//             ],
//           },
//         },
//         corporateMDAs: {
//           $sum: {
//             $cond: [{ $eq: ["$_id.MDAType", MDAType.COMPANY] }, "$count", 0],
//           },
//         },
//       },
//     },
//     // {
//     //   $sort: { _id: 1 },
//     // },
//     {
//       $project: {
//         date: "$_id",
//         totalMDAs: 1,
//         individualMDAs: 1,
//         corporateMDAs: 1,
//         _id: 0,
//       },
//     },
//   ];

//   const chartData = await MDAs.aggregate(pipeline).exec();

//   // Calculate totals
//   const totalMDAs = chartData.reduce(
//     (sum, point) => sum + point.totalMDAs,
//     0
//   );
//   const individualMDAs = chartData.reduce(
//     (sum, point) => sum + point.individualMDAs,
//     0
//   );
//   const corporateMDAs = chartData.reduce(
//     (sum, point) => sum + point.corporateMDAs,
//     0
//   );

//   const result: MDAChartData = {
//     totalMDAs,
//     individualMDAs,
//     corporateMDAs,
//     chartData,
//   };

//   // Cache for 5 minutes
//   await redisClient.set(cacheKey, JSON.stringify(result), "EX", 300);
//   logger.info("MDAs chart data calculated and cached", { cacheKey });
//   end(metricLabels);
//   return result;
// };

export const getCompanyAggregatedEmployeesService = async (
  timeFrameDays: number = 60,
  MDAId: string
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
    const queryParameter: FilterQuery<IMDA> = {
      // MDAType: "COMPANY",
      createdAt: { $gte: timeFrameDate },
      employerTin: MDAId,
    };
    const aggregationResult = await MDAs.aggregate([
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
      totalActiveMDA: formatAmountWithSuffix(totalEmployees),
    };
  } catch (error: any) {
    logger.error("Failed to aggregate employer's tax payers", {
      error: error.message,
    });
    end({ ...metricLabels, success: "false" });
    throw error;
  }
};
