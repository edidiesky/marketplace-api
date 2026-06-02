import mongoose, { Schema, Document, Types } from "mongoose";
import { UserType } from "../auth/auth.model";

export interface IRole extends Document {
  _id:         Types.ObjectId;
  name:        string;
  userType:    UserType;
  description: string;
  isSystem:    boolean;
  isActive:    boolean;
  createdAt:   Date;
  updatedAt:   Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },
    userType: {
      type:     String,
      enum:     Object.values(UserType),
      required: true,
      index:    true,
    },
    description: {
      type: String,
      trim: true,
    },
    isSystem: {
      type:    Boolean,
      default: false,
    },
    isActive: {
      type:    Boolean,
      default: true,
      index:   true,
    },
  },
  { timestamps: true }
);

RoleSchema.index({ userType: 1, isActive: 1 });

export default mongoose.model<IRole>("Role", RoleSchema);