import mongoose, { Schema, Document, Types } from "mongoose";

export interface IIdempotencyKey extends Document {
  _id:          Types.ObjectId;
  requestHash:  string;
  endpoint:     string;
  userId:       Types.ObjectId;
  paymentId?:   string;
  responseBody: Record<string, unknown>;
  statusCode:   number;
  expiresAt:    Date;
  createdAt:    Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    requestHash: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    endpoint: {
      type:     String,
      required: true,
    },
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    paymentId: {
      type: String,
    },
    responseBody: {
      type:     Schema.Types.Mixed,
      required: true,
    },
    statusCode: {
      type:     Number,
      required: true,
    },
    expiresAt: {
      type:     Date,
      required: true,
      index:    true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

IdempotencyKeySchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model<IIdempotencyKey>(
  "IdempotencyKey",
  IdempotencyKeySchema
);