import { Types } from "mongoose";
import { walletRepository } from "./wallet.repository";
import { ledgerRepository } from "../ledger/ledger.repository";
import { AppError }         from "../../utils/AppError";
import { IWallet }          from "./wallet.model";

export const walletService = {
  async getOrCreateWallet(
    sellerId: string,
    storeId:  string
  ): Promise<IWallet> {
    return walletRepository.getOrCreate(
      new Types.ObjectId(sellerId),
      new Types.ObjectId(storeId)
    );
  },

  async getWalletBySellerId(sellerId: string): Promise<IWallet> {
    const wallet = await walletRepository.findBySellerId(
      new Types.ObjectId(sellerId)
    );
    if (!wallet) throw AppError.notFound("Wallet was not found.");
    return wallet;
  },

  async reconcile(walletId: string): Promise<{
    storedBalance:   number;
    computedBalance: number;
    drift:           number;
  }> {
    const wallet = await walletRepository.findById(walletId);
    if (!wallet) throw AppError.notFound("Wallet was not found.");

    const computedBalance = await ledgerRepository.recomputeBalance(
      new Types.ObjectId(walletId)
    );

    const drift = parseFloat((wallet.balance - computedBalance).toFixed(2));

    return { storedBalance: wallet.balance, computedBalance, drift };
  },
};