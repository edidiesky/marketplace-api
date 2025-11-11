import mongoose, { Schema, Types } from "mongoose";

export interface IColor {
  userId: Types.ObjectId;
  tenantId: Types.ObjectId;
  storeId: Types.ObjectId;
  name: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const ColorSchema = new Schema<IColor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    storeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Store",
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Store",
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

ColorSchema.index({ storeId: 1, userId: 1, tenantId: 1 });

const ColorModel = mongoose.model<IColor>("Color", ColorSchema);
export default ColorModel;
