import mongoose, { Schema, Document } from "mongoose";

export enum OutboxEventStatus {
  PENDING   = "pending",
  COMPLETED = "completed",
  DEAD      = "dead",
}

export enum OutboxEventType {
  PRODUCT_CREATED = "product.created",
  PRODUCT_UPDATED = "product.updated",
  PRODUCT_DELETED = "product.deleted",
}

export interface IOutboxEvent extends Document {
  _id:         mongoose.Types.ObjectId;
  type:        OutboxEventType;
  payload:     Record<string, unknown>;
  status:      OutboxEventStatus;
  retryCount:  number;
  lastError?:  string;
  processedAt?: Date;
  createdAt:   Date;
  updatedAt:   Date;
}

const OutboxEventSchema = new Schema<IOutboxEvent>(
  {
    type: {
      type:     String,
      enum:     Object.values(OutboxEventType),
      required: true,
    },
    payload:    { type: Schema.Types.Mixed, required: true },
    status: {
      type:    String,
      enum:    Object.values(OutboxEventStatus),
      default: OutboxEventStatus.PENDING,
    },
    retryCount:  { type: Number, default: 0 },
    lastError:   { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

OutboxEventSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model<IOutboxEvent>("OutboxEvent", OutboxEventSchema);