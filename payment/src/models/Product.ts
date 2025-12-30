import mongoose, { Document, Schema, Types } from "mongoose";

export enum ProductCategory {
  ELECTRONICS = "electronics",
  FASHION = "fashion",
  HOME_APPLIANCES = "home_appliances",
  BOOKS = "books",
  GROCERIES = "groceries",
  TOYS = "toys",
  SPORTS = "sports",
  BEAUTY = "beauty",
  AUTOMOTIVE = "automotive",
  HEALTH = "health",
}

export enum PaymentStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum PaymentMethod {
  CARD = "card",
  BANK_TRANSFER = "bank transfer",
  USSD = "ussd",
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
  method: PaymentMethod;
  customerEmail: string;
  customerName: string;
  metadata: any;
  paidAt?: Date;
  refundedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    paymentId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "NGN" },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default:PaymentStatus.PENDING,
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      default:PaymentMethod.CARD,
    },
    customerEmail: String,
    customerName: String,
    metadata: Schema.Types.Mixed,
    paidAt: Date,
    refundedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);
