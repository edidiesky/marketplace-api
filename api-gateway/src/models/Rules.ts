import mongoose, { Document, Schema } from "mongoose";

export enum RulesIDType {
  USER_ID = "user_id",
  IP = "ip",
  API_KEY = "api_key",
}

export interface IRules extends Document {
  _id: any;
  id_type: RulesIDType;
  id_value: string;
  resource: string;
  limits: {
    algorithm: string;
    max_req: number;
    windowMs: number;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RulesSchema = new Schema<IRules>(
  {
    id_type: {
      type: String,
      enum: Object.values(RulesIDType),
      required: true,
    },
    id_value: {
      type: String,
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    limits: {
      algorithm: { type: String },
      max_req: { type: Number },
      windowMs: { type: Number },
    },

    enabled: {
      type: Boolean,
    },
  },
  { timestamps: true },
);

RulesSchema.index({ createdAt: 1, id_type: 1 });
RulesSchema.index({ resource: 1 });

export default mongoose.model<IRules>("Rules", RulesSchema);
