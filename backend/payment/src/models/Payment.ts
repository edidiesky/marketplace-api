import mongoose, { Document, Schema, Types } from "mongoose";

export enum PaymentStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
}

export enum PaymentMethod {
  CARD = "card",
  BANK_TRANSFER = "bank_transfer",
  USSD = "ussd",
}

export enum PaymentGateway {
  PAYSTACK = "paystack",
  FLUTTERWAVE = "flutterwave",
  INTERSWITCH = "interswitch",
  STRIPE = "stripe",
  PAYPAL = "paypal",
}

export interface IPayment extends Document {
  orderId: Types.ObjectId;
  customerId: Types.ObjectId;
  ownerId: Types.ObjectId;
  storeId: Types.ObjectId;
  paymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway: PaymentGateway;
  method: PaymentMethod;
  customerEmail: string;
  customerName: string;
  metadata: Record<string, any>;
  paidAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  sagaId: string;
  createdAt: Date;
  updatedAt: Date;
  phone:string;
  version:number;
  redirectUrl:string,
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    phone:String,
    customerId: { type: Schema.Types.ObjectId, required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true },
    storeId: { type: Schema.Types.ObjectId, required: true },
    paymentId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN", uppercase: true },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    gateway: {
      type: String,
      enum: Object.values(PaymentGateway),
      required: true,
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    customerEmail: { type: String, required: true },
    customerName: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    paidAt: Date,
    failedAt: Date,
    refundedAt: Date,
    sagaId: { type: String, required: true },
  },
  { timestamps: true }
);

PaymentSchema.pre("save", function(next) {
  if(this.isModified() || this.isNew) {
    this.version = (this.version || 0) + 1
  }
  next()
})

// Indexes
PaymentSchema.index({ paymentId: 1 });
PaymentSchema.index({ sagaId: 1 });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ customerId: 1, createdAt: -1 });

PaymentSchema.index(
  { customerName: "text", customerEmail: "text", paymentId: "text", status:"text" },
  {
    name: "payment_search_idx",
  }
);

export default mongoose.model<IPayment>("Payment", PaymentSchema);
