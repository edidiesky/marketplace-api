import mongoose, { Document, Schema, Types } from "mongoose";

export interface IWallet extends Document {
  _id: any;
  sellerId: Types.ObjectId;
  storeId: Types.ObjectId;
  balance: number;
  currency: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    sellerId: { type: Schema.Types.ObjectId, required: true },
    storeId: { type: Schema.Types.ObjectId, required: true },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "NGN", uppercase: true },
    version: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

WalletSchema.pre("save", function (next) {
  if (this.isModified() || this.isNew) {
    this.version = (this.version || 0) + 1;
  }
  next();
});

WalletSchema.index({ sellerId: 1 });
WalletSchema.index({ storeId: 1 });

export default mongoose.model<IWallet>("Wallet", WalletSchema);