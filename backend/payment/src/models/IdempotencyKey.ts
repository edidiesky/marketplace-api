import mongoose, { Document, Schema, Types } from "mongoose";

export interface IIdempotencyKey extends Document {
  requestHash: string;
  endpoint: string;
  userId: Types.ObjectId;
  paymentId?: string;
  responseBody: Record<string, unknown>;
  statusCode: number;
  expiresAt: Date;
  createdAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    requestHash: { type: String, required: true, unique: true },
    endpoint: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    paymentId: { type: String },
    responseBody: { type: Schema.Types.Mixed, required: true },
    statusCode: { type: Number, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

IdempotencyKeySchema.index({ requestHash: 1 });
IdempotencyKeySchema.index({ userId: 1, endpoint: 1 });

export default mongoose.model<IIdempotencyKey>("IdempotencyKey", IdempotencyKeySchema);