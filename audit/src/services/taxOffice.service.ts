import { formatAmountWithSuffix } from "../utils/formatAmount";
import TaxStations, { ITaxStation } from "../models/TaxOffices";
import mongoose, { FilterQuery } from "mongoose";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import { databaseQueryTimeHistogram } from "../utils/metrics";
interface ChartDataPoint {
  date: string;
  totalTaxStations: number;
  individualTaxStations: number;
  corporateTaxStations: number;
}

/**
 * @description Get list of TaxStations  of a  also perform filtering options
 * @param queryObject FilterQuery<ITaxStation>
 * @param skip number
 * @param limit number
 * @returns
 */
export const GetAllTaxStationService = async (
  queryObject: FilterQuery<ITaxStation>,
  skip: number = 0,
  limit: number = 10
): Promise<{
  taxStations: ITaxStation[];
  totalPages: number;
  totalCount: number;
}> => {
  const metricLabels = {
    operation: "get_all_TaxStation",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  // const redisTaxStationKey = `TaxStations:${JSON.stringify({
  //   ...queryObject,
  //   skip,
  //   limit,
  // })}`;
  // const cachedTaxStations = await redisClient.get(redisTaxStationKey);
  // if (cachedTaxStations) {
  //   return JSON.parse(cachedTaxStations);
  // }
  const taxStations = await TaxStations.find(queryObject)
    .skip(skip)
    .limit(limit)
    .sort("-createdAt")
    .lean();

  const totalCount = await TaxStations.countDocuments(queryObject);
  const totalPages = Math.ceil(totalCount / limit);

  // await redisClient.set(
  //   redisTaxStationKey,
  //   JSON.stringify(TaxStations),
  //   "EX",
  //   3600
  // );
  end(metricLabels);
  return { taxStations, totalCount, totalPages };
};

// Get A Single TaxStations Document
export const GetASingleTaxStationService = async (
  id: string
): Promise<ITaxStation | null> => {
  const metricLabels = {
    operation: "get_single_TaxStation",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  try {
    const redisKey = `TaxStation:${id}`;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      logger.error(`Invalid id`);
      throw new Error("Invalid id");
    }

    const TaxStationExists = await redisClient.get(redisKey);
    if (TaxStationExists) {
      return JSON.parse(TaxStationExists);
    }

    const TaxStation = await TaxStations.findById(id).lean();
    if (!TaxStation) {
      logger.error(`TaxStations not found for ID: ${id}`, {
        data: TaxStation,
      });
      throw new Error(`TaxStations not found for ID: ${id}`);
    }
    logger.info("TaxStations details fetched sucessfully!", {
      // data: TaxStation,
    });
    await redisClient.set(redisKey, JSON.stringify(TaxStation), "EX", 3000);
    end(metricLabels);
    return TaxStation;
  } catch (error) {
    logger.error(
      "GetASingleTaxStationService: Failed to get a single TaxStation",
      {
        error,
      }
    );
    end({
      ...metricLabels,
      success: "false",
    });
    throw error;
  }
};

// Update a TaxStations
export const UpdateTaxStationService = async (
  TaxStationID: string,
  body: Partial<ITaxStation>
): Promise<ITaxStation | null | string> => {
  logger.info("TaxStations Payment Status Data:", {
    data: body,
  });

  const metricLabels = {
    operation: "update_single_TaxStation",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  await GetASingleTaxStationService(TaxStationID);

  const updatedTaxStation = await TaxStations.findOneAndUpdate(
    { _id: TaxStationID },
    body,
    {
      new: true,
    }
  ).lean();
  logger.info("TaxStations payment updated succesfully!");
  end(metricLabels);
  return updatedTaxStation;
};

// Delete a ITaxStation
export const DeleteTaxStationService = async (id: string): Promise<string> => {
  const metricLabels = {
    operation: "Delete_single_TaxStation",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  await GetASingleTaxStationService(id);
  await TaxStations.findByIdAndDelete(id);
  end(metricLabels);
  return "TaxStations has been deleted";
};

export const getAggregatedTaxStationService = async (
  TaxStationId: string,
  role: string,
  timeFrameDays: number = 60,
  activeTimeFrameDays: number = 60,
  corporateTimeFrameDays: number = 60,
  individualFrameDays: number = 60
): Promise<any> => {
  const metricLabels = {
    operation: "get_aggregated_TaxStation",
    success: "true",
  };
  const end = databaseQueryTimeHistogram.startTimer();
  const queryParameter: FilterQuery<ITaxStation> = {};
  if (role === "INDIVIDUAL" || role === "COMPANY") {
    queryParameter.TaxStationId = TaxStationId;
  }

  // Total active TaxStations
  const timeFrameDate = new Date();
  const currTimeFrameDate = timeFrameDate.getUTCDate();
  timeFrameDate.setUTCDate(currTimeFrameDate - timeFrameDays);

  // Total active TaxStations
  const activeTimeFrameDate = new Date();
  const curractiveTimeFrameDate = activeTimeFrameDate.getUTCDate();
  activeTimeFrameDate.setUTCDate(curractiveTimeFrameDate - activeTimeFrameDays);

  // Total COMPANY active TaxStations
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

  const aggregation = await TaxStations.aggregate([
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
        totalActiveTaxStations: [
          { $match: { status: "active" } }, // Adjust based on your schema
          { $count: "total" },
        ],
      },
    },
  ]);

  logger.info("Employer tax payers aggregated successfully", {
    TaxStationId,
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
    totalActiveTaxStations: formatAmountWithSuffix(
      aggregation[0].totalActiveTaxStations[0]?.total || 0
    ),
  };
};
