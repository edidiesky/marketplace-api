import mongoose, { Schema } from "mongoose";

export enum IOutboxEventStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  DEAD = "dead",
}

export enum IOutboxEventType {
  PRODUCT_ONBOARDING_COMPLETED_TOPIC = "product.onboarding.completed.topic",
}

export interface IOutboxEvent {
  _id: string;
  status: IOutboxEventStatus;
  type: IOutboxEventType;
  retryCount: number;
  lastError: string;
  payload: Record<string, any>;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

const OutboxEventSchema = new Schema<IOutboxEvent>(
  {
    type: {
      type: String,
      enum: Object.values(IOutboxEventType),
      required: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: Object.values(IOutboxEventStatus),
      default: IOutboxEventStatus.PENDING,
    },
    retryCount: { type: Number, default: 0 },
    lastError: { type: String },
    processedAt: { type: Date },
  },
  {
    timestamps: true,

    versionKey:"__v"
  },
);
OutboxEventSchema.index({ status: 1, createdAt: 1 });
export default mongoose.model<IOutboxEvent>("OutboxEvent", OutboxEventSchema);
