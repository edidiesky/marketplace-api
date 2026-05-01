import mongoose, { Document, Schema } from "mongoose";

export interface FailedMessage extends Document {
  topic: string;
  data: any;
  error: string;
  createdAt: Date;
  retryCount: number;
}

const FailedMessageSchema = new Schema<FailedMessage>(
  {
    topic: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    error: { type: String, required: true },
    createdAt: { type: Date, required: true },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FailedMessageSchema.index({ topic: 1, createdAt: 1 });

export const FailedMessage = mongoose.model<FailedMessage>(
  "FailedMessage",
  FailedMessageSchema
);

