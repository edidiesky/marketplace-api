import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICartItems {
  productId: Types.ObjectId;
  productTitle: string;
  productDescription: string;
  productPrice: number;
  productQuantity: number;
  reservedAt: Date;
  productImage: string[];
}

export interface ICart extends Document {
  _id: any;
  userId: Types.ObjectId;
  storeId: Types.ObjectId;
  fullName: string;
  quantity: number;
  totalPrice: number;
  cartItems: ICartItems[];
  createdAt: Date;
  updatedAt: Date;
  expireAt: Date;
}

const CartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    totalPrice: {
      type: Number,
      min: 0,
      required: true,
    },
    cartItems: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productTitle: { type: String, required: true },
        productImage: { type: [String], required: true },
        productPrice: { type: Number, required: true },
        productQuantity: { type: Number, required: true, min: 1 },
        reservedAt: Date,
      },
    ],
    expireAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);
CartSchema.index({ userId: 1, storeId: 1 }, { unique: true });
CartSchema.index({ store: 1 });
CartSchema.index({ category: 1 });
CartSchema.index({ size: 1 });
CartSchema.index({ createdAt: -1 });

export default mongoose.model<ICart>("Cart", CartSchema);
