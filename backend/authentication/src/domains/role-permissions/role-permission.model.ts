import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRolePermission extends Document {
  _id:          Types.ObjectId;
  roleId:       Types.ObjectId;
  permissionId: Types.ObjectId;
  granted:      boolean;
  createdAt:    Date;
  updatedAt:    Date;
}

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    roleId: {
      type:     Schema.Types.ObjectId,
      ref:      "Role",
      required: true,
      index:    true,
    },
    permissionId: {
      type:     Schema.Types.ObjectId,
      ref:      "Permission",
      required: true,
      index:    true,
    },
    granted: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
RolePermissionSchema.index({ roleId: 1, granted: 1 });

export default mongoose.model<IRolePermission>(
  "RolePermission",
  RolePermissionSchema
);