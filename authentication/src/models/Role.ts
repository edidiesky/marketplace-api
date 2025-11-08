import mongoose, { Schema, Document } from "mongoose";
import { RoleLevel, Permission } from "./User";
export interface IRole extends Document {
  roleCode: string;
  roleName: string;
  level: RoleLevel;
  permissions: Permission[];
  description?: string;
  isActive: boolean;
  parentRole?: mongoose.Types.ObjectId;
  childRoles: mongoose.Types.ObjectId[];
  createdBy: string;
  updatedBy: string;
}


const RoleSchema = new Schema<IRole>(
  {
    roleCode: {
      type: String,
      required: true,
      unique: true,
    },
    roleName: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      required: true,
    },
    permissions: [
      {
        type: String,
        enum: Object.values(Permission),
      },
    ],
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    parentRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    childRoles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    createdBy: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

RoleSchema.index({ roleCode: 1 });
RoleSchema.index({ directorate: 1, level: 1 });
RoleSchema.index({ isActive: 1 });

export const Role = mongoose.model<IRole>("Role", RoleSchema);
export interface IUserRole extends Document {
  userId: string;
  roleId: mongoose.Types.ObjectId;
  assignedBy: string;
  reason: string;
  assignedAt: Date;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  updatedAt: Date;
  scope?: {
    states?: string[];
    lgas?: string[];
    permissions?: string[];
    taxStations?: mongoose.Types.ObjectId[];
  };
}

const UserRoleSchema = new Schema<IUserRole>(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    assignedBy: {
      type: String,
      ref: "User",
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
    },
    scope: {
      states: [String],
      lgas: [String],
      permissions: [String],
      taxStations: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TaxStation",
        },
      ],
    },
  },
  { timestamps: true }
);

UserRoleSchema.index({ userId: 1, isActive: 1 });
UserRoleSchema.index({ roleId: 1 });
UserRoleSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

export const UserRole = mongoose.model<IUserRole>("UserRole", UserRoleSchema);
