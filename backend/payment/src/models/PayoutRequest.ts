import mongoose, { Document, Schema, Types } from "mongoose";

export enum PayoutStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
}

export interface BankDetails {
  accountNumber: string;
  bankCode: string;
  accountName: string;
}

export interface IPayoutRequest extends Document {
  _id: any;
  sellerId: Types.ObjectId;
  storeId: Types.ObjectId;
  walletId: Types.ObjectId;
  amount: number;
  currency: string;
  bankDetails: BankDetails;
  status: PayoutStatus;
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  rejectionReason?: string;
  ledgerEntryId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutRequestSchema = new Schema<IPayoutRequest>(
  {
    sellerId: { type: Schema.Types.ObjectId, required: true },
    storeId: { type: Schema.Types.ObjectId, required: true },
    walletId: { type: Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "NGN", uppercase: true },
    bankDetails: {
      accountNumber: { type: String, required: true },
      bankCode: { type: String, required: true },
      accountName: { type: String, required: true },
    },
    status: {
      type: String,
      enum: Object.values(PayoutStatus),
      default: PayoutStatus.PENDING,
    },
    requestedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId },
    rejectionReason: { type: String },
    ledgerEntryId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

PayoutRequestSchema.index({ sellerId: 1, createdAt: -1 });
PayoutRequestSchema.index({ storeId: 1, status: 1 });
PayoutRequestSchema.index({ status: 1, requestedAt: -1 });

export default mongoose.model<IPayoutRequest>("PayoutRequest", PayoutRequestSchema);