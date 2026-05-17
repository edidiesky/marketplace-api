import mongoose, { Schema, Document, Types } from "mongoose";

export enum BillingPlan {
  FREE       = "FREE",
  PRO        = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

export enum SubscriptionStatus {
  TRIAL     = "trial",
  ACTIVE    = "active",
  EXPIRED   = "expired",
  CANCELLED = "cancelled",
}

export interface IPlanFeatures {
  maxStores:       number;
  maxProducts:     number;
  maxOrders:       number;
  customDomain:    boolean;
  analytics:       boolean;
  prioritySupport: boolean;
  commissionRate:  number;
}

export const PLAN_FEATURES: Record<BillingPlan, IPlanFeatures> = {
  [BillingPlan.FREE]: {
    maxStores:       1,
    maxProducts:     50,
    maxOrders:       100,
    customDomain:    false,
    analytics:       false,
    prioritySupport: false,
    commissionRate:  500,
  },
  [BillingPlan.PRO]: {
    maxStores:       5,
    maxProducts:     500,
    maxOrders:       2000,
    customDomain:    true,
    analytics:       true,
    prioritySupport: false,
    commissionRate:  300,
  },
  [BillingPlan.ENTERPRISE]: {
    maxStores:       -1,
    maxProducts:     -1,
    maxOrders:       -1,
    customDomain:    true,
    analytics:       true,
    prioritySupport: true,
    commissionRate:  150,
  },
};

export interface ISubscription extends Document {
  _id:                Types.ObjectId;
  organizationId:     string;
  ownerId:            Types.ObjectId;
  plan:               BillingPlan;
  status:             SubscriptionStatus;
  features:           IPlanFeatures;
  trialEndsAt?:       Date;
  currentPeriodStart: Date;
  currentPeriodEnd:   Date;
  cancelAtPeriodEnd:  boolean;
  upgradedAt?:        Date;
  previousPlan?:      BillingPlan;
  createdAt:          Date;
  updatedAt:          Date;
}

const PlanFeaturesSchema = new Schema<IPlanFeatures>(
  {
    maxStores:       { type: Number, required: true },
    maxProducts:     { type: Number, required: true },
    maxOrders:       { type: Number, required: true },
    customDomain:    { type: Boolean, required: true },
    analytics:       { type: Boolean, required: true },
    prioritySupport: { type: Boolean, required: true },
    commissionRate:  { type: Number, required: true },
  },
  { _id: false }
);

const SubscriptionSchema = new Schema<ISubscription>(
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
    plan: {
      type:    String,
      enum:    Object.values(BillingPlan),
      default: BillingPlan.FREE,
    },
    status: {
      type:    String,
      enum:    Object.values(SubscriptionStatus),
      default: SubscriptionStatus.TRIAL,
      index:   true,
    },
    features:           { type: PlanFeaturesSchema, required: true },
    trialEndsAt:        { type: Date },
    currentPeriodStart: { type: Date, required: true, default: Date.now },
    currentPeriodEnd:   { type: Date, required: true },
    cancelAtPeriodEnd:  { type: Boolean, default: false },
    upgradedAt:         { type: Date },
    previousPlan:       { type: String, enum: Object.values(BillingPlan) },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ organizationId: 1, status: 1 });

export default mongoose.model<ISubscription>(
  "Subscription",
  SubscriptionSchema
);