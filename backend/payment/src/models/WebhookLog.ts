import mongoose, { Document, Schema } from "mongoose";
import { PaymentGateway } from "./Payment";

export enum WebhookLogStatus {
  PENDING = "pending",
  FAILED = "failed",
  PERMANENT_FAILURE = "permanent_failure",
  COMPLETED = "completed",
}

export interface IWebhookLog extends Document {
  gateway: PaymentGateway;
  transactionId: string;
  rawPayload: Record<string, any>;
  failureReason?: string;
  retryCount: number;
  lastAttemptAt: Date;
  nextRetryAt?: Date;
  status: WebhookLogStatus;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookLogSchema = new Schema<IWebhookLog>(
  {
    gateway: {
      type: String,
      enum: Object.values(PaymentGateway),
      required: true,
    },
    transactionId: { type: String, required: true },
    rawPayload: { type: Schema.Types.Mixed, required: true },
    failureReason: { type: String },
    retryCount: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date, required: true },
    nextRetryAt: { type: Date },
    status: {
      type: String,
      enum: Object.values(WebhookLogStatus),
      default: WebhookLogStatus.PENDING,
    },
  },
  { timestamps: true }
);

WebhookLogSchema.index({ transactionId: 1 });
WebhookLogSchema.index({ status: 1, nextRetryAt: 1 });
WebhookLogSchema.index({ gateway: 1, createdAt: -1 });

export default mongoose.model<IWebhookLog>("WebhookLog", WebhookLogSchema);