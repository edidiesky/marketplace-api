import withTransaction from "../utils/connectDB";
import LedgerEntry, {
  ILedgerEntry,
  LedgerEntryType,
  LedgerEntryStatus,
} from "../models/LedgerEntry";
import Wallet from "../models/Wallet";
import logger from "../utils/logger";
import { Types } from "mongoose";
import mongoose from "mongoose";

const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE ?? "0.05");

export class LedgerRepository {
  /**
   * Write CREDIT + FEE entries and update wallet balance.
   * Accepts an external session so it participates in the
   * caller's transaction. Does NOT start its own transaction.
   */
  async creditOnPaymentConfirmed(
    data: {
      sellerId: Types.ObjectId;
      storeId: Types.ObjectId;
      walletId: Types.ObjectId;
      orderId: Types.ObjectId;
      paymentId: string;
      grossAmount: number;
    },
    session: mongoose.ClientSession,
  ): Promise<{ credit: ILedgerEntry; fee: ILedgerEntry }> {
    const fee = parseFloat((data.grossAmount * PLATFORM_FEE_RATE).toFixed(2));
    const net = parseFloat((data.grossAmount - fee).toFixed(2));

    const wallet = await Wallet.findById(data.walletId).session(session);
    if (!wallet) throw new Error("Wallet not found");

    const balanceAfterCredit = parseFloat((wallet.balance + net).toFixed(2));

    const [creditEntry] = await LedgerEntry.create(
      [
        {
          sellerId: data.sellerId,
          storeId: data.storeId,
          walletId: data.walletId,
          orderId: data.orderId,
          paymentId: data.paymentId,
          type: LedgerEntryType.CREDIT,
          amount: net,
          balanceAfter: balanceAfterCredit,
          description: `Payment received for order ${data.orderId}`,
          status: LedgerEntryStatus.COMPLETED,
          idempotencyKey: `credit-${data.paymentId}`,
        },
      ],
      { session },
    );

    const [feeEntry] = await LedgerEntry.create(
      [
        {
          sellerId: data.sellerId,
          storeId: data.storeId,
          walletId: data.walletId,
          orderId: data.orderId,
          paymentId: data.paymentId,
          type: LedgerEntryType.FEE,
          amount: fee,
          balanceAfter: balanceAfterCredit,
          description: `Platform fee (${PLATFORM_FEE_RATE * 100}%) for order ${data.orderId}`,
          status: LedgerEntryStatus.COMPLETED,
          idempotencyKey: `fee-${data.paymentId}`,
        },
      ],
      { session },
    );

    await Wallet.findByIdAndUpdate(
      data.walletId,
      { $inc: { balance: net } },
      { session },
    );

    logger.info("Ledger credit and fee entries written", {
      paymentId: data.paymentId,
      grossAmount: data.grossAmount,
      net,
      fee,
      balanceAfter: balanceAfterCredit,
    });

    return { credit: creditEntry, fee: feeEntry };
  }

  async debitOnRefund(data: {
    sellerId: Types.ObjectId;
    storeId: Types.ObjectId;
    walletId: Types.ObjectId;
    orderId: Types.ObjectId;
    paymentId: string;
    refundAmount: number;
  }): Promise<ILedgerEntry> {
    return withTransaction(async (session) => {
      const wallet = await Wallet.findById(data.walletId).session(session);
      if (!wallet) throw new Error("Wallet not found");

      if (wallet.balance < data.refundAmount) {
        throw new Error("INSUFFICIENT_WALLET_BALANCE");
      }

      const balanceAfter = parseFloat(
        (wallet.balance - data.refundAmount).toFixed(2),
      );

      const [entry] = await LedgerEntry.create(
        [
          {
            sellerId: data.sellerId,
            storeId: data.storeId,
            walletId: data.walletId,
            orderId: data.orderId,
            paymentId: data.paymentId,
            type: LedgerEntryType.REFUND,
            amount: data.refundAmount,
            balanceAfter,
            description: `Refund for order ${data.orderId}`,
            status: LedgerEntryStatus.COMPLETED,
            idempotencyKey: `refund-${data.paymentId}`,
          },
        ],
        { session },
      );

      await Wallet.findByIdAndUpdate(
        data.walletId,
        { $inc: { balance: -data.refundAmount } },
        { session },
      );

      return entry;
    });
  }

  async debitOnPayout(data: {
    sellerId: Types.ObjectId;
    storeId: Types.ObjectId;
    walletId: Types.ObjectId;
    payoutRequestId: Types.ObjectId;
    amount: number;
  }): Promise<ILedgerEntry> {
    return withTransaction(async (session) => {
      const wallet = await Wallet.findById(data.walletId).session(session);
      if (!wallet) throw new Error("Wallet not found");

      if (wallet.balance < data.amount) {
        throw new Error("INSUFFICIENT_WALLET_BALANCE");
      }

      const balanceAfter = parseFloat(
        (wallet.balance - data.amount).toFixed(2),
      );

      const [entry] = await LedgerEntry.create(
        [
          {
            sellerId: data.sellerId,
            storeId: data.storeId,
            walletId: data.walletId,
            orderId: data.payoutRequestId,
            paymentId: `payout-${data.payoutRequestId}`,
            type: LedgerEntryType.PAYOUT,
            amount: data.amount,
            balanceAfter,
            description: `Payout approved for request ${data.payoutRequestId}`,
            status: LedgerEntryStatus.COMPLETED,
            idempotencyKey: `payout-${data.payoutRequestId}`,
          },
        ],
        { session },
      );

      await Wallet.findByIdAndUpdate(
        data.walletId,
        { $inc: { balance: -data.amount } },
        { session },
      );

      return entry;
    });
  }

  async recomputeBalance(walletId: Types.ObjectId): Promise<number> {
    const result = await LedgerEntry.aggregate([
      { $match: { walletId, status: LedgerEntryStatus.COMPLETED } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $in: ["$type", [LedgerEntryType.CREDIT]] },
                "$amount",
                { $multiply: ["$amount", -1] },
              ],
            },
          },
        },
      },
    ]);

    return result[0]?.total ?? 0;
  }
}

export const ledgerRepository = new LedgerRepository();
