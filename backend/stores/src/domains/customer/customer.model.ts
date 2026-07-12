import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICustomer extends Document {
  _id:            Types.ObjectId;
  storeId:        Types.ObjectId;
  email:          string;
  name:           string;
  userId?:        Types.ObjectId;
  totalSpent:     number;
  orderCount:     number;
  firstPurchaseAt: Date;
  lastPurchaseAt:  Date;
  createdAt:      Date;
  updatedAt:      Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    storeId: { type: Schema.Types.ObjectId, required: true, index: true },
    email:   { type: String, required: true, lowercase: true, trim: true },
    name:    { type: String, required: true },
    userId:  { type: Schema.Types.ObjectId },

    totalSpent:      { type: Number, default: 0, min: 0 },
    orderCount:      { type: Number, default: 0, min: 0 },
    firstPurchaseAt: { type: Date, required: true },
    lastPurchaseAt:  { type: Date, required: true },
  },
  { timestamps: true }
);


CustomerSchema.index({ storeId: 1, email: 1 }, { unique: true });
CustomerSchema.index({ storeId: 1, totalSpent: -1 });
CustomerSchema.index({ storeId: 1, lastPurchaseAt: -1 });

export default mongoose.model<ICustomer>("Customer", CustomerSchema);