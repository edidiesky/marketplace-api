import { Response, Request } from "express";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import asyncHandler from "express-async-handler";
import {
  DeleteTaxStationService,
  GetAllTaxStationService,
  GetASingleTaxStationService,
  UpdateTaxStationService,
} from "../services/taxOffice.service";
import { ITaxStation } from "../models/TaxOffices";
import { FilterQuery } from "mongoose";
import redisClient from "../config/redis";
import logger from "../utils/logger";

type AuthenticatedRequest = Request & {
  TaxStation: {
    TaxStationId: string;
    role: string;
  };
};

/**
 * @description It retrieves all TaxStationss for a  with optional filtering and pagination, cached in Redis.
 * @route GET /api/v1/TaxStationss
 * @access Private (it will need JWT authentication)
 * @param {string} req.param - The ID of the
 * @throws {Error} BAD_REQUEST_STATUS_CODE - If query parameters are invalid
 */
export const GetAllTaxStationsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.user as { userId: string };
    const {
      page = "1",
      limit = "10",
      lga,
      TaxStationType,
      location,
      startDate,
      search,
      endDate,
    } = req.query;
    const queryObjects: FilterQuery<ITaxStation> = {};
    if (TaxStationType) queryObjects.TaxStationType = TaxStationType;

    if (location) queryObjects.location = location;
    if (lga) queryObjects.lga = lga;
    if (endDate && startDate)
      queryObjects.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };

    if (search) {
      queryObjects.$or = [
        { name: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { lga: { $regex: search, $options: "i" } },
      ];
    }
    const parsedLimit = Number(limit) || 10;
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const taxOfficeRedisKey = `redis:taxoffice:${userId}:${JSON.stringify({
      ...queryObjects,
      skip,
      limit,
    })}`;
    // CHECK FOR CACHE HIT
    const cachedTaxOfficeData = await redisClient.get(taxOfficeRedisKey);

    if (cachedTaxOfficeData) {
      logger.info("Taxoffice Redis cache hit:", {
        taxOfficeRedisKey,
      });
      res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(JSON.parse(cachedTaxOfficeData));
      return;
    }
    // logger.info("Query Search paramter:", queryObjects);
    const { taxStations, totalCount, totalPages } =
      await GetAllTaxStationService(queryObjects, skip, parsedLimit);

      const result ={
      data: taxStations,
      pagination: {
        totalCount,
        totalPages,
        limit: parsedLimit,
        page: parsedPage,
      },
    }
    logger.info("Taxoffice Redis cache miss:", {
      taxOfficeRedisKey,
    });
    await redisClient.set(taxOfficeRedisKey, JSON.stringify(result), "EX", 3600)
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(result);
  }
);

/**
 * @description It gets a single TaxStation by ID.
 * @route GET /TaxStations/:id
 * @access Private (it will need JWT authentication)
 * @param {string} req.params.id - The ID of the TaxStation to fetch
 * @param {string} req.TaxStation.TaxStationId - TaxStation ID from JWT token
 * @returns {object} SUCCESSFULLY_FETCHED_STATUS_CODE - The TaxStation object
 * @throws {Error} BAD_REQUEST_STATUS_CODE - If TaxStation is not found or TaxStation is unauthorized
 */
export const GetSingleTaxStationsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    // const TaxStationId = (req as AuthenticatedRequest).TaxStation.TaxStationId;
    // const redisKey = `TaxStations:${TaxStationId}:${id}`;
    // const cachedTaxStations = await redisClient.get(redisKey);
    // if (cachedTaxStations) {
    //   res
    //     .status(SUCCESSFULLY_FETCHED_STATUS_CODE)
    //     .json(JSON.parse(cachedTaxStations));
    // }

    const TaxStation = await GetASingleTaxStationService(id);

    // await redisClient.set(redisKey, JSON.stringify(TaxStation), "EX", 3600);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(TaxStation);
  }
);

/**
 * @description It Updates an existing TaxStation by ID.
 * @route PUT /TaxStations/:id
 * @access Private (it will need JWT authentication)
 * @param {string} req.params.id - The ID of the TaxStation to update
 * @param {object} req.body - Updated TaxStation details
 */
export const UpdateTaxStationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { TaxStationId, role } = (req as AuthenticatedRequest).TaxStation;
    const existingTaxStation = await GetASingleTaxStationService(id);
    if (!existingTaxStation) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("TaxStation not found");
    }
    const updatedTaxStation = await UpdateTaxStationService(id, req.body);
    await redisClient.del(`TaxStation:${TaxStationId}:${id}`); // Invalidating the cache for a single TaxStation
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(updatedTaxStation);
  }
);

/**
 * @description It deletes a TaxStation by ID.
 * @route DELETE /TaxStations/:id
 * @access Private (it will need JWT authentication)
 * @param {string} req.params.id - The ID of the TaxStation to delete
 * @param {string} req.TaxStation.TaxStationId - TaxStation ID from JWT token
 * @returns {object} SUCCESSFULLY_FETCHED_STATUS_CODE - Success message
 * @throws {Error} BAD_REQUEST_STATUS_CODE - If TaxStation does not exist
 */
export const DeleteTaxStationHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const TaxStationId = (req as AuthenticatedRequest).TaxStation.TaxStationId;
    const existingTaxStation = await GetASingleTaxStationService(id);
    if (!existingTaxStation) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("TaxStation not found");
    }
    const message = await DeleteTaxStationService(id);
    await redisClient.del(`TaxStation:${TaxStationId}:${id}`); // Invalidating the  cache since we are removing a TaxStation
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ message });
  }
);
