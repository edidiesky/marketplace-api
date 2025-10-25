import { Response, Request } from "express";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import asyncHandler from "express-async-handler";
import {
  DeleteMDAService,
  GetAllMDAService,
  GetASingleMDAService,
  UpdateMDAService,
} from "../services/mdas.service";
import { IMDA } from "../models/MDAs";
import { FilterQuery } from "mongoose";
import redisClient from "../config/redis";
import logger from "../utils/logger";

type AuthenticatedRequest = Request & {
  MDAs: {
    MDAsId: string;
    role: string;
  };
};

/**
 * @description It retrieves all MDAsss for a  with optional filtering and pagination, cached in Redis.
 * @route GET /api/v1/MDAs
 * @access Private (it will need JWT authentication)
 * @param {string} req.param - The ID of the
 * @throws {Error} BAD_REQUEST_STATUS_CODE - If query parameters are invalid
 */
export const GetAllMDAssHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.user as { userId: string };

    const {
      page = "1",
      limit = "12",
      revenueLines,
      MDAsType,
      name,
      startDate,
      search,
      endDate,
    } = req.query;
    const queryObjects: FilterQuery<IMDA> = {};
    if (MDAsType) queryObjects.MDAsType = MDAsType;

    if (name) queryObjects.name = name;
    if (revenueLines) queryObjects.revenueLines = revenueLines;
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
        { name: { $regex: search, $options: "i" } },
        { jurisdiction: { $regex: search, $options: "i" } },
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
      logger.info("MDAS Redis cache hit:", {
        taxOfficeRedisKey,
      });
      res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(JSON.parse(cachedTaxOfficeData));
      return;
    }

    // logger.info("Query Search paramter:", queryObjects);
    const { mDAs, totalCount, totalPages } = await GetAllMDAService(
      queryObjects,
      skip,
      parsedLimit
    );

    const result = {
      data: mDAs,
      pagination: {
        totalCount,
        totalPages,
        limit: parsedLimit,
        page: parsedPage,
      },
    };

    logger.info("MDAS Redis cache miss:", {
      taxOfficeRedisKey,
    });
    await redisClient.set(
      taxOfficeRedisKey,
      JSON.stringify(result),
      "EX",
      3600
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      data: mDAs,
      pagination: {
        totalCount,
        totalPages,
        limit: parsedLimit,
        page: parsedPage,
      },
    });
  }
);

/**
 * @description It gets a single MDAs by ID.
 * @route GET /MDAss/:id
 * @access Private (it will need JWT authentication)
 * @param {string} req.params.id - The ID of the MDAs to fetch
 * @param {string} req.MDAs.MDAsId - MDAs ID from JWT token
 * @returns {object} SUCCESSFULLY_FETCHED_STATUS_CODE - The MDAs object
 * @throws {Error} BAD_REQUEST_STATUS_CODE - If MDAs is not found or MDAs is unauthorized
 */
export const GetSingleMDAssHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const MDAs = await GetASingleMDAService(id);

    // await redisClient.set(redisKey, JSON.stringify(MDAs), "EX", 3600);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(MDAs);
  }
);

/**
 * @description It Updates an existing MDAs by ID.
 * @route PUT /MDAss/:id
 * @access Private (it will need JWT authentication)
 * @param {string} req.params.id - The ID of the MDAs to update
 * @param {object} req.body - Updated MDAs details
 */
export const UpdateMDAsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { MDAsId, role } = (req as AuthenticatedRequest).MDAs;
    const existingMDAs = await GetASingleMDAService(id);
    if (!existingMDAs) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("MDAs not found");
    }
    const updatedMDAs = await UpdateMDAService(id, req.body);
    await redisClient.del(`MDAs:${MDAsId}:${id}`); // Invalidating the cache for a single MDAs
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(updatedMDAs);
  }
);

/**
 * @description It deletes a MDAs by ID.
 * @route DELETE /MDAss/:id
 * @access Private (it will need JWT authentication)
 * @param {string} req.params.id - The ID of the MDAs to delete
 * @param {string} req.MDAs.MDAsId - MDAs ID from JWT token
 * @returns {object} SUCCESSFULLY_FETCHED_STATUS_CODE - Success message
 * @throws {Error} BAD_REQUEST_STATUS_CODE - If MDAs does not exist
 */
export const DeleteMDAsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const MDAsId = (req as AuthenticatedRequest).MDAs.MDAsId;
    const existingMDAs = await GetASingleMDAService(id);
    if (!existingMDAs) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("MDAs not found");
    }
    const message = await DeleteMDAService(id);
    await redisClient.del(`MDAs:${MDAsId}:${id}`); // Invalidating the  cache since we are removing a MDAs
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ message });
  }
);
