import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  CreateColorService,
  GetAllStoreColorService,
  GetASingleColorService,
  UpdateColorService,
  DeleteColorService,
} from "../services//color.service";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants.js";
import { AuthenticatedRequest } from "../types/index";
import { FilterQuery } from "mongoose";
import { IColor } from "../models/Color";

export const CreateColorHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, value } = req.body as { name: string; value: string };
    const storeid = req.params.storeid;
    const { userId } = (req as AuthenticatedRequest).user;

    const color = await CreateColorService(userId, storeid, { name, value });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(color);
  }
);

export const GetAllStoreColorHandler = asyncHandler(
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

    let queryFilter: FilterQuery<IColor> = {
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

    const { colors, totalCount, totalPages } = await GetAllStoreColorService(
      queryFilter,
      skip,
      parsedLimit
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      data: colors,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalCount,
        totalPages,
      },
    });
  }
);

export const GetSingleStoreColorHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const color = await GetASingleColorService(id);

    if (!color) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This color does not exist");
    }

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(color);
  }
);

export const UpdateColorHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = await GetASingleColorService(id);

    if (!existing) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This color does not exist");
    }

    const updated = await UpdateColorService(id, req.body);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(updated);
  }
);

export const DeleteColorHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = await GetASingleColorService(id);

    if (!existing) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This color does not exist");
    }

    await DeleteColorService(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      message: "Color has been deleted",
      data: null,
    });
  }
);