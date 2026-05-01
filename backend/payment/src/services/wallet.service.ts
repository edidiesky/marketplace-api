import { walletRepository } from "../repository/WalletRepository";
import { ledgerRepository } from "../repository/LedgerRepository";
import { IWallet } from "../models/Wallet";
import { Types } from "mongoose";
import logger from "../utils/logger";

export class WalletService {
  async getOrCreateWallet(
    sellerId: string,
    storeId: string
  ): Promise<IWallet> {
    return walletRepository.getOrCreate(
      new Types.ObjectId(sellerId),
      new Types.ObjectId(storeId)
    );
  }

  async getWalletBySellerId(sellerId: string): Promise<IWallet> {
    const wallet = await walletRepository.findBySellerId(
      new Types.ObjectId(sellerId)
    );
    if (!wallet) throw new Error("Wallet not found");
    return wallet;
  }

  /**
   * Reconcile: recompute balance from ledger entries and compare to stored balance.
   * Used by admin for audit. Does not update the stored balance.
   */
  async reconcile(
    walletId: string
  ): Promise<{ storedBalance: number; computedBalance: number; drift: number }> {
    const wallet = await walletRepository.findById(walletId);
    if (!wallet) throw new Error("Wallet not found");

    const computedBalance = await ledgerRepository.recomputeBalance(
      new Types.ObjectId(walletId)
    );

    const drift = parseFloat(
      (wallet.balance - computedBalance).toFixed(2)
    );

    if (drift !== 0) {
      logger.warn("Wallet balance drift detected", {
        walletId,
        storedBalance: wallet.balance,
        computedBalance,
        drift,
      });
    }

    return {
      storedBalance: wallet.balance,
      computedBalance,
      drift,
    };
  }
}

export const walletService = new WalletService();