import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { payoutService }        from "./payout.service";
import { AuthenticatedRequest } from "../../middleware/contextMiddleware";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";

export const RequestPayoutHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { amount, bankDetails, storeId } = req.body as {
      amount:      number;
      bankDetails: { accountNumber: string; bankCode: string; accountName: string };
      storeId:     string;
    };

    const request = await payoutService.requestPayout(
      userId,
      storeId,
      amount,
      bankDetails
    );

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      data:    request,
    });
  }
);

export const ApprovePayoutHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId }         = (req as AuthenticatedRequest).user;
    const payoutRequestId    = req.params["payoutRequestId"] as string;

    const result = await payoutService.approvePayout(payoutRequestId, userId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const RejectPayoutHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId }      = (req as AuthenticatedRequest).user;
    const payoutRequestId = req.params["payoutRequestId"] as string;
    const { reason }      = req.body as { reason: string };

    const result = await payoutService.rejectPayout(
      payoutRequestId,
      userId,
      reason
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const GetMyPayoutsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const payouts    = await payoutService.getSellerPayouts(userId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    payouts,
    });
  }
);

export const GetPendingPayoutsHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const payouts = await payoutService.getPendingPayouts();

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    payouts,
    });
  }
);