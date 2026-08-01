import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { inventoryAnalyticsService } from "./analytics.service";
import { AppError } from "../../utils/AppError";
import { readGatewayContext } from "../../utils/readGatewayContext";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../../constants";

export const GetInventoryAnalyticsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ctx     = readGatewayContext(req);
    const storeId = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const daysByRange: Record<string, number> = { "7-days": 7, "3-weeks": 21, "3-months": 90 };
    const range = (req.query["range"] as string) ?? "3-months";
    const days  = daysByRange[range] ?? 90;

    const analytics = await inventoryAnalyticsService.getAnalytics(storeId, days);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    analytics,
    });
  }
);