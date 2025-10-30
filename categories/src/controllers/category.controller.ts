import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  CreateCategoryService,
  GetAllStoreCategoryService,
  GetASingleCategoryService,
  UpdateCategoryService,
  DeleteCategoryService,
} from "../services/category.service";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants.js";
import { AuthenticatedRequest } from "../types/index";
import { FilterQuery } from "mongoose";
import { ICategory } from "../models/Categories";

export const CreateCategoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, value } = req.body as { name: string; value: string };
    const storeid = req.params.storeid;
    const { userId } = (req as AuthenticatedRequest).user;

    const category = await CreateCategoryService(userId, storeid, { name, value });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(category);
  }
);

export const GetAllStoreCategoryHandler = asyncHandler(
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

    let queryFilter: FilterQuery<ICategory> = {
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

    const { categories, totalCount, totalPages } = await GetAllStoreCategoryService(
      queryFilter,
      skip,
      parsedLimit
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      data: categories,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalCount,
        totalPages,
      },
    });
  }
);

export const GetSingleStoreCategoryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await GetASingleCategoryService(id);

    if (!category) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This category does not exist");
    }

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(category);
  }
);

export const UpdateCategoryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = await GetASingleCategoryService(id);

    if (!existing) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This category does not exist");
    }

    const updated = await UpdateCategoryService(id, req.body);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(updated);
  }
);

export const DeleteCategoryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const existing = await GetASingleCategoryService(id);

    if (!existing) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This category does not exist");
    }

    await DeleteCategoryService(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      message: "Category has been deleted",
      data: null,
    });
  }
);