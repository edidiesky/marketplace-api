import mongoose, { Document, Schema } from "mongoose";

export enum OutboxEventStatus {
  PENDING = "pending",
  PROCESSED = "processed",
  DEAD = "dead",
}

export enum OutboxEventType {
  PAYMENT_CONFIRMED = "payment.confirmed",
  PAYMENT_FAILED = "payment.failed",
  PAYMENT_INITIATED = "order.payment.initiated.topic",
}

export interface IOutboxEvent extends Document {
  _id: mongoose.Types.ObjectId;
  type: OutboxEventType;
  payload: Record<string, any>;
  status: OutboxEventStatus;
  retryCount: number;
  lastError?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OutboxEventSchema = new Schema<IOutboxEvent>(
  {
    type: {
      type: String,
      enum: Object.values(OutboxEventType),
      required: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: Object.values(OutboxEventStatus),
      default: OutboxEventStatus.PENDING,
    },
    retryCount: { type: Number, default: 0 },
    lastError: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

OutboxEventSchema.index({ status: 1, createdAt: 1 });
OutboxEventSchema.index({ status: 1, retryCount: 1 });

export default mongoose.model<IOutboxEvent>("OutboxEvent", OutboxEventSchema);