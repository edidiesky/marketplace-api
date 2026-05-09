import { ObjectId } from "mongoose";
import { IAction, IResource } from "./permission.constant";
import mongoose, { Schema } from "mongoose";

// Permission
export interface IPermission {
  _id: ObjectId;
  resource: IResource;
  action: IAction;
  description: string;
  isActive: boolean;
  createdBy:string;
  updatedBy:string;
}

const PermissionSchema = new Schema<IPermission>(
  {
    resource: {
      type: String,
      enum: Object.values(IResource),
    },
    action: {
      type: String,
      enum: Object.values(IAction),
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

PermissionSchema.index({ resource: 1, isActive: 1  });

export const Permission = mongoose.model<IPermission>(
  "Permission",
  PermissionSchema,
);
