import mongoose, { Schema, Document, Types } from "mongoose";

export enum OrganizationStatus {
  DRAFT     = "DRAFT",
  ACTIVE    = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED   = "DELETED",
}

export enum OrganizationType {
  SELLER_INDIVIDUAL = "SELLER_INDIVIDUAL",
  SELLER_BUSINESS   = "SELLER_BUSINESS",
  MARKETPLACE       = "MARKETPLACE",
  FRANCHISE         = "FRANCHISE",
  ADMIN_PLATFORM    = "ADMIN_PLATFORM",
  ADMIN_PARTNER     = "ADMIN_PARTNER",
  CUSTOMER_B2C      = "CUSTOMER_B2C",
  CUSTOMER_B2B      = "CUSTOMER_B2B",
  INVESTOR_ANGEL    = "INVESTOR_ANGEL",
  INVESTOR_VC       = "INVESTOR_VC",
  ADVISOR           = "ADVISOR",
  SYSTEM_INTERNAL   = "SYSTEM_INTERNAL",
}

export enum BillingPlan {
  FREE       = "FREE",
  PRO        = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

export interface IOrganizationSettings {
  timezone: string;
  currency: string;
  locale:   string;
}

export interface IOrganization extends Document {
  _id:            Types.ObjectId;
  organizationId: string;
  ownerId:        Types.ObjectId;
  ownerEmail:     string;
  ownerName:      string;
  name?:          string;
  description?:   string;
  logo?:          string;
  type:           OrganizationType;
  billingPlan:    BillingPlan;
  status:         OrganizationStatus;
  trialEndsAt?:   Date;
  settings:       IOrganizationSettings;
  createdAt:      Date;
  updatedAt:      Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    organizationId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    ownerId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    ownerEmail:  { type: String, required: true },
    ownerName:   { type: String, required: true },
    name:        { type: String, trim: true },
    description: { type: String, trim: true },
    logo:        { type: String },
    type: {
      type:     String,
      enum:     Object.values(OrganizationType),
      required: true,
    },
    billingPlan: {
      type:    String,
      enum:    Object.values(BillingPlan),
      default: BillingPlan.FREE,
    },
    status: {
      type:    String,
      enum:    Object.values(OrganizationStatus),
      default: OrganizationStatus.DRAFT,
      index:   true,
    },
    trialEndsAt: { type: Date },
    settings: {
      timezone: { type: String, default: "UTC"   },
      currency: { type: String, default: "NGN"   },
      locale:   { type: String, default: "en-NG" },
    },
  },
  { timestamps: true }
);

OrganizationSchema.index({ ownerId: 1, status: 1 });
OrganizationSchema.index({ type: 1,   status: 1 });

export default mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema
);