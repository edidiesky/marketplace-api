import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { walletService }        from "./wallet.service";
import { AuthenticatedRequest } from "../../middleware/contextMiddleware";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../../constants";

export const GetMyWalletHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const wallet     = await walletService.getWalletBySellerId(userId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    wallet,
    });
  }
);

export const ReconcileWalletHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const walletId = req.params["walletId"] as string;
    const result   = await walletService.reconcile(walletId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);