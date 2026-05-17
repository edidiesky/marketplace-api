import mongoose, { Types } from "mongoose";
import PayoutRequest, { IPayoutRequest, PayoutStatus, IBankDetails } from "./payout.model";
import { walletRepository }  from "../wallet/wallet.repository";
import { ledgerRepository }  from "../ledger/ledger.repository";
import { AppError }          from "../../utils/AppError";
import logger                from "../../utils/logger";
import { SERVICE_NAME }      from "../../constants";
import { requestContext }    from "../../context/requestContext";

export const payoutService = {
  async requestPayout(
    sellerId:    string,
    storeId:     string,
    amount:      number,
    bankDetails: IBankDetails
  ): Promise<IPayoutRequest> {
    const wallet = await walletRepository.findBySellerId(
      new Types.ObjectId(sellerId)
    );
    if (!wallet)           throw AppError.notFound("Wallet not found.");
    if (wallet.balance < amount) throw AppError.badRequest("Insufficient wallet balance.");
    if (amount < 1)        throw AppError.badRequest("Minimum payout is 1.");

    const pending = await PayoutRequest.findOne({
      sellerId: new Types.ObjectId(sellerId),
      status:   PayoutStatus.PENDING,
    });
    if (pending) {
      throw AppError.conflict("You already have a pending payout request.");
    }

    const request = await PayoutRequest.create({
      sellerId:    new Types.ObjectId(sellerId),
      storeId:     new Types.ObjectId(storeId),
      walletId:    wallet._id,
      amount,
      bankDetails,
      status:      PayoutStatus.PENDING,
      requestedAt: new Date(),
    });

    logger.info("payout_request_created", {
      event:           "payout_request_created",
      service:         SERVICE_NAME,
      payoutRequestId: request._id.toString(),
      sellerId,
      amount,
      requestId:       requestContext.get()?.requestId,
    });

    return request;
  },

  async approvePayout(
    payoutRequestId: string,
    adminUserId:     string
  ): Promise<IPayoutRequest> {
    const session = await mongoose.startSession();
    let result!:   IPayoutRequest;

    await session.withTransaction(async () => {
      const request = await PayoutRequest.findById(payoutRequestId).session(
        session
      );
      if (!request) throw AppError.notFound("Payout request not found.");
      if (request.status !== PayoutStatus.PENDING) {
        throw AppError.badRequest(
          `Cannot approve payout in status: ${request.status}`
        );
      }

      const wallet = await walletRepository.findById(
        request.walletId.toString()
      );
      if (!wallet) throw AppError.notFound("Wallet not found.");
      if (wallet.balance < request.amount) {
        throw AppError.badRequest("Insufficient wallet balance.");
      }

      const ledgerEntry = await ledgerRepository.debitOnPayout(
        {
          sellerId:        request.sellerId,
          storeId:         request.storeId,
          walletId:        request.walletId,
          payoutRequestId: request._id,
          amount:          request.amount,
        },
        session
      );

      const updated = await PayoutRequest.findByIdAndUpdate(
        payoutRequestId,
        {
          $set: {
            status:        PayoutStatus.APPROVED,
            reviewedAt:    new Date(),
            reviewedBy:    new Types.ObjectId(adminUserId),
            ledgerEntryId: ledgerEntry._id,
          },
        },
        { new: true, session }
      );

      result = updated!;
    });

    session.endSession();

    logger.info("payout_approved", {
      event:           "payout_approved",
      service:         SERVICE_NAME,
      payoutRequestId,
      adminUserId,
      requestId:       requestContext.get()?.requestId,
    });

    return result;
  },

  async rejectPayout(
    payoutRequestId: string,
    adminUserId:     string,
    reason:          string
  ): Promise<IPayoutRequest> {
    const request = await PayoutRequest.findById(payoutRequestId);
    if (!request) throw AppError.notFound("Payout request not found.");
    if (request.status !== PayoutStatus.PENDING) {
      throw AppError.badRequest(
        `Cannot reject payout in status: ${request.status}`
      );
    }

    const updated = await PayoutRequest.findByIdAndUpdate(
      payoutRequestId,
      {
        $set: {
          status:          PayoutStatus.REJECTED,
          reviewedAt:      new Date(),
          reviewedBy:      new Types.ObjectId(adminUserId),
          rejectionReason: reason,
        },
      },
      { new: true }
    );

    logger.info("payout_rejected", {
      event:           "payout_rejected",
      service:         SERVICE_NAME,
      payoutRequestId,
      adminUserId,
      reason,
      requestId:       requestContext.get()?.requestId,
    });

    return updated!;
  },

  async getPendingPayouts(): Promise<IPayoutRequest[]> {
    return PayoutRequest.find({ status: PayoutStatus.PENDING })
      .sort({ requestedAt: 1 })
      .lean<IPayoutRequest[]>()
      .exec();
  },

  async getSellerPayouts(sellerId: string): Promise<IPayoutRequest[]> {
    return PayoutRequest.find({ sellerId: new Types.ObjectId(sellerId) })
      .sort({ requestedAt: -1 })
      .lean<IPayoutRequest[]>()
      .exec();
  },
};