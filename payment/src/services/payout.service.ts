import { Types } from "mongoose";
import PayoutRequest, { IPayoutRequest, PayoutStatus, BankDetails } from "../models/PayoutRequest";
import { walletRepository } from "../repository/WalletRepository";
import { ledgerRepository } from "../repository/LedgerRepository";
import logger from "../utils/logger";
import withTransaction from "../utils/connectDB";

export class PayoutService {
  async requestPayout(
    sellerId: string,
    storeId: string,
    amount: number,
    bankDetails: BankDetails
  ): Promise<IPayoutRequest> {
    const wallet = await walletRepository.findBySellerId(
      new Types.ObjectId(sellerId)
    );

    if (!wallet) throw new Error("Wallet not found");
    if (wallet.balance < amount) throw new Error("INSUFFICIENT_WALLET_BALANCE");
    if (amount < 1) throw new Error("Minimum payout is 1");

    const pending = await PayoutRequest.findOne({
      sellerId: new Types.ObjectId(sellerId),
      status: PayoutStatus.PENDING,
    });

    if (pending) throw new Error("You already have a pending payout request");

    const request = await PayoutRequest.create({
      sellerId: new Types.ObjectId(sellerId),
      storeId: new Types.ObjectId(storeId),
      walletId: wallet._id,
      amount,
      bankDetails,
      status: PayoutStatus.PENDING,
      requestedAt: new Date(),
    });

    logger.info("Payout request created", {
      payoutRequestId: request._id,
      sellerId,
      amount,
    });

    return request;
  }

  async approvePayout(
    payoutRequestId: string,
    adminUserId: string
  ): Promise<IPayoutRequest> {
    return withTransaction(async (session) => {
      const request = await PayoutRequest.findById(payoutRequestId).session(session);

      if (!request) throw new Error("Payout request not found");
      if (request.status !== PayoutStatus.PENDING) {
        throw new Error(`Cannot approve payout in status: ${request.status}`);
      }

      const wallet = await walletRepository.findById(request.walletId.toString());
      if (!wallet) throw new Error("Wallet not found");

      if (wallet.balance < request.amount) {
        throw new Error("INSUFFICIENT_WALLET_BALANCE");
      }

      // Write ledger entry and deduct from wallet
      const ledgerEntry = await ledgerRepository.debitOnPayout({
        sellerId: request.sellerId,
        storeId: request.storeId,
        walletId: request.walletId,
        payoutRequestId: request._id,
        amount: request.amount,
      });

      const updated = await PayoutRequest.findByIdAndUpdate(
        payoutRequestId,
        {
          $set: {
            status: PayoutStatus.APPROVED,
            reviewedAt: new Date(),
            reviewedBy: new Types.ObjectId(adminUserId),
            ledgerEntryId: ledgerEntry._id,
          },
        },
        { new: true, session }
      );

      logger.info("Payout approved", {
        payoutRequestId,
        adminUserId,
        amount: request.amount,
        ledgerEntryId: ledgerEntry._id,
      });

      return updated!;
    });
  }

  async rejectPayout(
    payoutRequestId: string,
    adminUserId: string,
    reason: string
  ): Promise<IPayoutRequest> {
    const request = await PayoutRequest.findById(payoutRequestId);
    if (!request) throw new Error("Payout request not found");
    if (request.status !== PayoutStatus.PENDING) {
      throw new Error(`Cannot reject payout in status: ${request.status}`);
    }

    const updated = await PayoutRequest.findByIdAndUpdate(
      payoutRequestId,
      {
        $set: {
          status: PayoutStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedBy: new Types.ObjectId(adminUserId),
          rejectionReason: reason,
        },
      },
      { new: true }
    );

    logger.info("Payout rejected", { payoutRequestId, adminUserId, reason });
    return updated!;
  }

  async getPendingPayouts(): Promise<IPayoutRequest[]> {
    return PayoutRequest.find({ status: PayoutStatus.PENDING })
      .sort({ requestedAt: 1 })
      .lean()
      .exec();
  }

  async getSellerPayouts(sellerId: string): Promise<IPayoutRequest[]> {
    return PayoutRequest.find({ sellerId: new Types.ObjectId(sellerId) })
      .sort({ requestedAt: -1 })
      .lean()
      .exec();
  }
}

export const payoutService = new PayoutService();