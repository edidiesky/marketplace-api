import mongoose, { Document, Schema, Types } from "mongoose";

export enum LedgerEntryType {
  CREDIT = "CREDIT",
  FEE = "FEE",
  REFUND = "REFUND",
  PAYOUT = "PAYOUT",
}

export enum LedgerEntryStatus {
  COMPLETED = "completed",
  PENDING = "pending",
  REVERSED = "reversed",
}

export interface ILedgerEntry extends Document {
  _id: any;
  sellerId: Types.ObjectId;
  storeId: Types.ObjectId;
  walletId: Types.ObjectId;
  orderId: Types.ObjectId;
  paymentId: string;
  type: LedgerEntryType;
  amount: number;
  balanceAfter: number;
  description: string;
  status: LedgerEntryStatus;
  idempotencyKey: string;
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    sellerId: { type: Schema.Types.ObjectId, required: true },
    storeId: { type: Schema.Types.ObjectId, required: true },
    walletId: { type: Schema.Types.ObjectId, required: true },
    orderId: { type: Schema.Types.ObjectId, required: true },
    paymentId: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(LedgerEntryType),
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(LedgerEntryStatus),
      default: LedgerEntryStatus.COMPLETED,
    },
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LedgerEntrySchema.index({ sellerId: 1, createdAt: -1 });
LedgerEntrySchema.index({ orderId: 1 });
LedgerEntrySchema.index({ paymentId: 1 });
LedgerEntrySchema.index({ idempotencyKey: 1 }, { unique: true });
LedgerEntrySchema.index({ walletId: 1, createdAt: -1 });

export default mongoose.model<ILedgerEntry>("LedgerEntry", LedgerEntrySchema);