import mongoose, { Schema, Document, Types } from "mongoose";

export enum PaymentStatus {
  PENDING   = "pending",
  SUCCESS   = "success",
  FAILED    = "failed",
  REFUNDED  = "refunded",
  CANCELLED = "cancelled",
}

export enum PaymentMethod {
  CARD          = "card",
  BANK_TRANSFER = "bank_transfer",
  USSD          = "ussd",
}

export enum PaymentGateway {
  PAYSTACK    = "paystack",
  FLUTTERWAVE = "flutterwave",
  INTERSWITCH = "interswitch",
  STRIPE      = "stripe",
  PAYPAL      = "paypal",
}

export interface IPayment extends Document {
  _id:           Types.ObjectId;
  orderId:       Types.ObjectId;
  customerId:    Types.ObjectId;
  ownerId:       Types.ObjectId;
  storeId:       Types.ObjectId;
  paymentId:     string;
  amount:        number;
  currency:      string;
  status:        PaymentStatus;
  gateway:       PaymentGateway;
  method:        PaymentMethod;
  customerEmail: string;
  customerName:  string;
  phone?:        string;
  sagaId:        string;
  metadata:      Record<string, unknown>;
  paidAt?:       Date;
  failedAt?:     Date;
  refundedAt?:   Date;
  version:       number;
  createdAt:     Date;
  updatedAt:     Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId:    { type: Schema.Types.ObjectId, ref: "Order", required: true },
    customerId: { type: Schema.Types.ObjectId, required: true },
    ownerId:    { type: Schema.Types.ObjectId, required: true },
    storeId:    { type: Schema.Types.ObjectId, required: true },
    paymentId:  { type: String, required: true, unique: true },
    amount:     { type: Number, required: true, min: 0 },
    currency:   { type: String, default: "NGN", uppercase: true },
    status: {
      type:    String,
      enum:    Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index:   true,
    },
    gateway: {
      type:     String,
      enum:     Object.values(PaymentGateway),
      required: true,
    },
    method: {
      type:     String,
      enum:     Object.values(PaymentMethod),
      required: true,
    },
    customerEmail: { type: String, required: true },
    customerName:  { type: String, required: true },
    phone:         { type: String },
    sagaId:        { type: String, required: true },
    metadata:      { type: Schema.Types.Mixed, default: {} },
    paidAt:        { type: Date },
    failedAt:      { type: Date },
    refundedAt:    { type: Date },
    version:       { type: Number, default: 1 },
  },
  { timestamps: true }
);

PaymentSchema.pre("save", function (next) {
  if (this.isModified() || this.isNew) {
    this.version = (this.version || 0) + 1;
  }
  next();
});

PaymentSchema.index({ paymentId: 1 });
PaymentSchema.index({ sagaId: 1 });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ customerId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ storeId: 1, createdAt: -1 });

export default mongoose.model<IPayment>("Payment", PaymentSchema);