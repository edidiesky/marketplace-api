import mongoose, { Schema, Types } from "mongoose";

export enum OrderStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum PaymentChannel {
  PAYSTACK = "PAYSTACK",
  FLUTTERWAVE = "FLUTTERWAVE",
  INTERSWITCH = "INTERSWITCH",
  STRIPE = "STRIPE",
}

export interface CartItems {
  productId: Types.ObjectId;
  productTitle: string;
  productDescription?: string;
  productPrice: number;
  productQuantity: number;
  reservedAt?: Date;
  productImage: string[];
}

export interface IOrder extends mongoose.Document {
  userId: Types.ObjectId;
  storeId: Types.ObjectId;
  cartId: Types.ObjectId;
  fullName: string;
  quantity: number;
  totalPrice: number;
  cartItems: CartItems[];
  version: number;
  orderStatus: OrderStatus;
  paymentChannel: PaymentChannel;
  transactionId?: string;
  paymentDate?: Date;
  requestId: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    cartId: {
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
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    cartItems: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productTitle: { type: String, required: true },
        productDescription: { type: String },
        productImage: { type: [String], required: true },
        productPrice: { type: Number, required: true },
        productQuantity: { type: Number, required: true, min: 1 },
        reservedAt: Date,
      },
    ],
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
    paymentChannel: {
      type: String,
      enum: Object.values(PaymentChannel),
      default: PaymentChannel.PAYSTACK,
    },
    transactionId: { type: String },
    paymentDate: { type: Date },
    requestId: {
      type: String,
      required: true,
      unique: true, 
    },
  },
  { timestamps: true }
);

OrderSchema.pre("save", function (next) {
  if (this.isModified() || this.isNew) {
    this.version = Number(this.version || 0) + 1;
  }
  next();
});


OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ storeId: 1, orderStatus: 1 });
OrderSchema.index({ storeId: 1, paymentChannel: 1 });
OrderSchema.index({ requestId: 1 });
OrderSchema.index({ cartId: 1 });
OrderSchema.index({ createdAt: -1 });

export default mongoose.model<IOrder>("Order", OrderSchema);