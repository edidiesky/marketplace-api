import Wallet, { IWallet } from "../models/Wallet";
import { Types } from "mongoose";
import mongoose from "mongoose";
import logger from "../utils/logger";

export class WalletRepository {
  async findBySellerId(sellerId: Types.ObjectId): Promise<IWallet | null> {
    return Wallet.findOne({ sellerId }).lean().exec();
  }

  async findById(walletId: string): Promise<IWallet | null> {
    return Wallet.findById(walletId).lean().exec();
  }

  async createWallet(
    sellerId: Types.ObjectId,
    storeId: Types.ObjectId,
    session?: mongoose.ClientSession,
  ): Promise<IWallet> {
    const [wallet] = await Wallet.create(
      [{ sellerId, storeId, balance: 0, currency: "NGN" }],
      session ? { session } : {},
    );

    logger.info("Wallet created", {
      walletId: wallet._id,
      sellerId,
      storeId,
    });

    return wallet;
  }

  async getOrCreate(
    sellerId: Types.ObjectId,
    storeId: Types.ObjectId,
    session?: mongoose.ClientSession,
  ): Promise<IWallet> {
    const existing = await Wallet.findOne({ sellerId }).session(
      session ?? null,
    );
    if (existing) return existing;
    return this.createWallet(sellerId, storeId, session);
  }
}

export const walletRepository = new WalletRepository();
