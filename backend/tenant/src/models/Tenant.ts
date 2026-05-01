import mongoose, { Document, Schema, Types } from "mongoose";

export enum BillingPlan {
  FREE = "FREE",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

export enum TenantStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED = "DELETED",
}

export enum TenantType {
  SELLER_INDIVIDUAL = "SELLER_INDIVIDUAL",
  SELLER_BUSINESS = "SELLER_BUSINESS",
  MARKETPLACE = "MARKETPLACE",
  FRANCHISE = "FRANCHISE",
  ADMIN_PLATFORM = "ADMIN_PLATFORM",
  ADMIN_PARTNER = "ADMIN_PARTNER",
  CUSTOMER_B2C = "CUSTOMER_B2C",
  CUSTOMER_B2B = "CUSTOMER_B2B",
  INVESTOR_ANGEL = "INVESTOR_ANGEL",
  INVESTOR_VC = "INVESTOR_VC",
  ADVISOR = "ADVISOR",
  SYSTEM_INTERNAL = "SYSTEM_INTERNAL",
  DEMO = "DEMO",
  TEST = "TEST",
}

export interface ITenant extends Document {
  // Core
  tenantId: string;
  ownerId: Types.ObjectId;
  ownerEmail: string;
  ownerName?: string;

  type: TenantType;
  status: TenantStatus;
  billingPlan: BillingPlan;

  trialEndsAt?: Date;
  currentPeriodEndsAt?: Date;
  cancelAtPeriodEnd: boolean;
  limits: {
    stores: number;
    products: number;
    teamMembers: number;
    apiCallsPerMonth: number;
  };
  metadata: {
    [key: string]: any;
  };

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        `tenant_${new mongoose.Types.ObjectId().toString().slice(-6)}`,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    ownerName: { type: String, trim: true },

    type: {
      type: String,
      enum: Object.values(TenantType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TenantStatus),
      default: TenantStatus.DRAFT,
    },
    billingPlan: {
      type: String,
      enum: Object.values(BillingPlan),
      default: BillingPlan.FREE,
    },
    trialEndsAt: { type: Date },
    currentPeriodEndsAt: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },

    // Quotas
    limits: {
      stores: { type: Number, default: 1 },
      products: { type: Number, default: 100 },
      teamMembers: { type: Number, default: 3 },
      apiCallsPerMonth: { type: Number, default: 10_000 },
    },

    metadata: { type: Schema.Types.Mixed, default: {} },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// INDEXES
TenantSchema.index({ ownerId: 1, status: 1 });
TenantSchema.index({ tenantId: 1 }, { unique: true });
TenantSchema.index({ status: 1 });
TenantSchema.index({ "limits.stores": 1 });
TenantSchema.index({ deletedAt: 1 }, { sparse: true });

// HOOKS
TenantSchema.pre("save", function (next) {
  if (
    this.isNew &&
    !this.trialEndsAt &&
    this.billingPlan === BillingPlan.FREE
  ) {
    this.trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  // Default
  const planLimits = {
    [BillingPlan.FREE]: {
      stores: 1,
      products: 100,
      teamMembers: 1,
      apiCallsPerMonth: 1_000,
    },
    [BillingPlan.PRO]: {
      stores: 5,
      products: 1_000,
      teamMembers: 10,
      apiCallsPerMonth: 50_000,
    },
    [BillingPlan.ENTERPRISE]: {
      stores: 999,
      products: 999_999,
      teamMembers: 999,
      apiCallsPerMonth: 999_999,
    },
  };

  if (this.isModified("billingPlan") || this.isNew) {
    Object.assign(this.limits, planLimits[this.billingPlan]);
  }

  next();
});

TenantSchema.virtual("isTrialActive").get(function () {
  return this.trialEndsAt ? new Date() < this.trialEndsAt : false;
});

TenantSchema.virtual("isActive").get(function () {
  return this.status === TenantStatus.ACTIVE;
});

export default mongoose.model<ITenant>("Tenant", TenantSchema);
