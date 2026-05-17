import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { searchRepository }         from "./search.repository";
import { AppError }                 from "../../utils/AppError";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../../constants";

export const SearchProductsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      q,
      storeId,
      minPrice,
      maxPrice,
      page  = "1",
      limit = "20",
    } = req.query;

    const result = await searchRepository.search({
      q:        q        as string | undefined,
      storeId:  storeId  as string | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      page:     Number(page),
      limit:    Math.min(Number(limit), 100),
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result.hits,
      total:   result.total,
      page:    Number(page),
      limit:   Number(limit),
    });
  }
);

export const AutocompleteProductsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { q, storeId } = req.query;

    if (!q) {
      throw AppError.badRequest("q query parameter is required.");
    }

    const suggestions = await searchRepository.autocomplete(
      q as string,
      storeId as string | undefined
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    suggestions,
    });
  }
);