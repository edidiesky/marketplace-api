import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types";
import { walletService } from "../services/wallet.service";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";

export const getMyWallet = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const wallet = await walletService.getWalletBySellerId(userId);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ success: true, data: wallet });
  }
);

export const reconcileWallet = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await walletService.reconcile(req.params.walletId);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ success: true, data: result });
  }
);