import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { orderAnalyticsService } from "./analytics.service";
import { AppError } from "../../utils/AppError";
import { readGatewayContext } from "../../utils/readGatewayContext";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../../constants";

export const GetOrderStatsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ctx     = readGatewayContext(req);
    const storeId = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const breakdown = await orderAnalyticsService.getStatusBreakdown(storeId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    breakdown,
    });
  }
);

export const GetOrderAnalyticsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ctx     = readGatewayContext(req);
    const storeId = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const range = (req.query["range"] as string) ?? "3-months";
    const analytics = await orderAnalyticsService.getAnalytics(storeId, range);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    analytics,
    });
  }
);