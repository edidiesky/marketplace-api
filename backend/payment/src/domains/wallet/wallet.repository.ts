import mongoose, { Types } from "mongoose";
import Wallet, { IWallet } from "./wallet.model";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";

export const walletRepository = {
  async findBySellerId(sellerId: Types.ObjectId): Promise<IWallet | null> {
    return Wallet.findOne({ sellerId }).lean<IWallet>().exec();
  },

  async findById(walletId: string): Promise<IWallet | null> {
    return Wallet.findById(walletId).lean<IWallet>().exec();
  },

  async create(
    sellerId: Types.ObjectId,
    storeId:  Types.ObjectId,
    session?: mongoose.ClientSession
  ): Promise<IWallet> {
    const options = session ? { session } : {};
    const [wallet] = await Wallet.create(
      [{ sellerId, storeId, balance: 0, currency: "NGN" }],
      options
    );

    logger.info("wallet_created", {
      event:    "wallet_created",
      service:  SERVICE_NAME,
      walletId: wallet._id.toString(),
      sellerId: sellerId.toString(),
      storeId:  storeId.toString(),
    });

    return wallet;
  },

  async getOrCreate(
    sellerId: Types.ObjectId,
    storeId:  Types.ObjectId,
    session?: mongoose.ClientSession
  ): Promise<IWallet> {
    const existing = await Wallet.findOne({ sellerId }).session(
      session ?? null
    );
    if (existing) return existing;
    return walletRepository.create(sellerId, storeId, session);
  },
};