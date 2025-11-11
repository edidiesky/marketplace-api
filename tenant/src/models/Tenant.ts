import mongoose, { Document, Schema, Types } from "mongoose";

export enum BillingPlanEnum {
  "FREE" = "FREE",
  "PRO" = "PRO",
  "ENTERPRISE" = "ENTERPRISE",
}

export enum TenantStatus {
  "ACTIVE" = "ACTIVE",
  "SUSPENDED" = "SUSPENDED",
  "DRAFT" = "DRAFT",
}

export interface ITenant {
  ownerId: Types.ObjectId;
  ownerName: string;
  ownerEmail: string;
  tenantStatus: TenantStatus;
  billingPlan: BillingPlanEnum;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    ownerName: String,
    ownerEmail: String,
    tenantStatus: {
      type: String,
      enum: Object.values(TenantStatus),
      default: TenantStatus.DRAFT,
    },
    billingPlan: {
      type: String,
      enum: Object.values(BillingPlanEnum),
      default: BillingPlanEnum.FREE,
    },
  },
  { timestamps: true }
);

TenantSchema.index({ createdAt: -1, ownerId: 1 });

export default mongoose.model<ITenant>("Tenant", TenantSchema);
