import { IAction, IResource } from "./permission.constant";
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPermission extends Document {
  _id:         Types.ObjectId;
  resource:    IResource;
  action:      IAction;
  description: string;
  isSystem:    boolean;
  isActive:    boolean;
  createdBy?:  string;
  updatedBy?:  string;
}

const PermissionSchema = new Schema<IPermission>(
  {
    resource: {
      type:     String,
      enum:     Object.values(IResource),
      required: true,
    },
    action: {
      type:     String,
      enum:     Object.values(IAction),
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isSystem: {
      type:    Boolean,
      default: false,
      index:   true,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    createdBy: {
      type:     String,
      required: function (this: IPermission) {
        return !this.isSystem;
      },
    },
    updatedBy: {
      type:     String,
      required: function (this: IPermission) {
        return !this.isSystem;
      },
    },
  },
  { timestamps: true },
);

PermissionSchema.index({ resource: 1, action: 1 }, { unique: true });
PermissionSchema.index({ resource: 1, isActive: 1 });

export const Permission = mongoose.model<IPermission>("Permission", PermissionSchema);