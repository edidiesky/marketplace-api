import logger from "../utils/logger";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
import { esProductRepository } from "../repository/ElasticsearchProductRepository";
import { Router, Request, Response } from "express";
import asyncHandler from "express-async-handler";
class EsController {
  search = asyncHandler(async (req: Request, res: Response) => {
    const {
      q,
      storeId,
      minPrice,
      maxPrice,
      page = "1",
      limit = "20",
    } = req.query;
    const result = await esProductRepository.search({
      q: q as string | undefined,
      storeId: storeId as string | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
    logger.info("Product search result:", {
      result,
      query: q,
    });
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(result);
  });
  autoComplete = asyncHandler(async (req: Request, res: Response) => {
    const { q, storeId } = req.query;
    if (!q) {
      res.json([]);
      return;
    }
    const suggestions = await esProductRepository.autocomplete(
      q as string,
      storeId as string | undefined,
    );
    logger.info("Product autocomplete result:", {
      suggestions,
      query: q,
    });
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(suggestions);
  });
}

export const esController = new EsController();
