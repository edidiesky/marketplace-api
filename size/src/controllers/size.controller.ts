import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  CreateSizeService,
  GetAllStoreSizeService,
  GetASingleSizeService,
  UpdateSizeService,
  DeleteSizeService,
} from "../services/size.service";

import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants.js";
import { AuthenticatedRequest } from "../types/index";
import { FilterQuery } from "mongoose";
import { ISize } from "../models/Size";

export const CreateSizeHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, value } = req.body as { name: string; value: string };
    const storeid = req.params.storeid;
    const { userId } = (req as AuthenticatedRequest).user;

    const size = await CreateSizeService(userId, storeid, { name, value });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(size);
  }
);

export const GetAllStoreSizeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const storeid = req.params.storeid;
    const {
      page = 1,
      limit = 10,
      search,
      name,
      startDate,
      endDate,
    } = req.query;

    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 10;
    const skip = (parsedPage - 1) * parsedLimit;

    let queryFilter: FilterQuery<ISize> = {
      store: storeid,
      user: userId,
    };

    if (startDate && endDate) {
      queryFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    if (search) {
      queryFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { value: { $regex: search, $options: "i" } },
      ];
    }

    if (name) {
      queryFilter.name = { $regex: name, $options: "i" };
    }

    const { sizes, totalCount, totalPages } = await GetAllStoreSizeService(
      queryFilter,
      skip,
      parsedLimit
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      data: sizes,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalCount,
        totalPages,
      },
    });
  }
);

export const GetSingleStoreSizeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const size = await GetASingleSizeService(id);

    if (!size) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This size does not exist");
    }

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(size);
  }
);

export const UpdateSizeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = await GetASingleSizeService(id);

    if (!existing) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This size does not exist");
    }

    const updated = await UpdateSizeService(id, req.body);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(updated);
  }
);

export const DeleteSizeHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = await GetASingleSizeService(id);

    if (!existing) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This size does not exist");
    }

    await DeleteSizeService(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      message: "Size has been deleted",
      data: null,
    });
  }
);