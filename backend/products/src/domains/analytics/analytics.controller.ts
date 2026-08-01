import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { productAnalyticsService } from "./analytics.service";
import { AppError } from "../../utils/AppError";
import { readGatewayContext } from "../../utils/readGatewayContext";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../../constants";

export const GetProductAnalyticsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ctx     = readGatewayContext(req);
    const storeId = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const analytics = await productAnalyticsService.getAnalytics(storeId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    analytics,
    });
  }
);