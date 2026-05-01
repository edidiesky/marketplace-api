import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types";
import { payoutService } from "../services/payout.service";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";

export const requestPayout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { amount, bankDetails, storeId } = req.body;

    const request = await payoutService.requestPayout(
      userId,
      storeId,
      amount,
      bankDetails
    );

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      data: request,
    });
  }
);

export const approvePayout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const result = await payoutService.approvePayout(
      req.params.payoutRequestId,
      userId
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ success: true, data: result });
  }
);

export const rejectPayout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { reason } = req.body;

    const result = await payoutService.rejectPayout(
      req.params.payoutRequestId,
      userId,
      reason
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ success: true, data: result });
  }
);

export const getMyPayouts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const payouts = await payoutService.getSellerPayouts(userId);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ success: true, data: payouts });
  }
);

export const getPendingPayouts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const payouts = await payoutService.getPendingPayouts();
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ success: true, data: payouts });
  }
);