import mongoose, { Schema, Types, Document } from "mongoose";

export enum OrderStatus {
  PENDING = "pending",
  RESERVING = "reserving",
  PAYMENT_PENDING = "payment_pending",
  PAYMENT_INITIATED = "payment_initiated",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  OUT_OF_STOCK = "out_of_stock",
}

export enum PaymentChannel {
  PAYSTACK = "PAYSTACK",
  FLUTTERWAVE = "FLUTTERWAVE",
  INTERSWITCH = "INTERSWITCH",
  STRIPE = "STRIPE",
}

export enum FulfillmentStatus {
  UNFULFILLED = "unfulfilled",
  PREPARING = "preparing",
  DISPATCHED = "dispatched",
  IN_TRANSIT = "in_transit",
  OUT_FOR_DELIVERY = "out_for_delivery",
  DELIVERED = "delivered",
  DELIVERY_FAILED = "delivery_failed",
  RETURNED = "returned",
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

export interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  postalCode?: string;
}

export interface IOrder extends Document {
  _id: any;
  userId: Types.ObjectId;
  sellerId: Types.ObjectId;
  storeId: Types.ObjectId;
  cartId: Types.ObjectId;
  fullName: string;
  quantity: number;
  totalPrice: number;
  cartItems: CartItems[];
  version: number;
  orderStatus: OrderStatus;
  paymentChannel?: PaymentChannel;
  transactionId?: string;
  failureReason?: string;
  paymentDate?: Date;
  requestId: string;
  sagaId: string;
  shipping?: ShippingAddress;
  createdAt: Date;
  updatedAt: Date;
  fulfillmentStatus: FulfillmentStatus;
  trackingNumber?: string;
  courierName?: string;
  receiptUrl?: string;
  receiptGeneratedAt?: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    sellerId: { type: Schema.Types.ObjectId, required: true },
    storeId: { type: Schema.Types.ObjectId, required: true },
    cartId: { type: Schema.Types.ObjectId, required: true },
    fullName: { type: String, required: true },
    totalPrice: { type: Number, min: 0, required: true },
    quantity: { type: Number, required: true, min: 0 },
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
    version: { type: Number, default: 1, min: 1 },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
    paymentChannel: {
      type: String,
      enum: Object.values(PaymentChannel),
    },
    transactionId: { type: String },
    paymentDate: { type: Date },
    failureReason: { type: String },
    requestId: { type: String, required: true, unique: true },
    sagaId: { type: String, required: true, unique: true },
    shipping: {
      fullName: { type: String },
      address: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      phone: { type: String },
      postalCode: { type: String },
    },
    fulfillmentStatus: {
      type: String,
      enum: Object.values(FulfillmentStatus),
      default: FulfillmentStatus.UNFULFILLED,
    },
    trackingNumber: { type: String },
    courierName: { type: String },
    receiptUrl: { type: String },
    receiptGeneratedAt: { type: Date },
  },
  { timestamps: true },
);

OrderSchema.pre("save", function (next) {
  if (this.isModified() || this.isNew) {
    this.version = Number(this.version || 0) + 1;
  }
  next();
});

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ sellerId: 1, createdAt: -1 });
OrderSchema.index({ storeId: 1, orderStatus: 1 });
OrderSchema.index({ storeId: 1, fulfillmentStatus: 1 });
OrderSchema.index({ requestId: 1 });
OrderSchema.index({ sagaId: 1 });
OrderSchema.index({ cartId: 1 });

export default mongoose.model<IOrder>("Order", OrderSchema);
