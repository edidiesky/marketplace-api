import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { paymentAnalyticsService } from "./analytics.service";
import { AppError } from "../../utils/AppError";
import { readGatewayContext } from "../../utils/readGatewayContext";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../../constants";

export const GetPaymentStatsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ctx     = readGatewayContext(req);
    const storeId = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const days  = Number(req.query["days"] ?? 30);
    const stats = await paymentAnalyticsService.getStats(storeId, days);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    stats,
    });
  }
);

export const GetPaymentAnalyticsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ctx     = readGatewayContext(req);
    const storeId = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const range = (req.query["range"] as string) ?? "3-months";
    const analytics = await paymentAnalyticsService.getAnalytics(storeId, range);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    analytics,
    });
  }
);