import mongoose, { Schema, Document } from "mongoose";

export enum UserType {
  SELLERS = "SELLERS",
  ADMIN = "ADMIN",
  INVESTORS = "INVESTORS",
  CUSTOMER = "CUSTOMER",
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

export enum RoleLevel {
  SUPER_ADMIN = 1,
  EXECUTIVE = 2,
  DIRECTORATE_HEAD = 3,
  MEMBER = 4,
}

export enum Permission {

  MANAGE_ROLES = "MANAGE_ROLES",
  READ_USER = "READ_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
  VIEW_REPORTS = "VIEW_REPORTS",
  // Platform-level
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
  MANAGE_TENANTS = "MANAGE_TENANTS",
  
  // Tenant-level
  TENANT_OWNER = "TENANT_OWNER",
  MANAGE_TEAM = "MANAGE_TEAM",
  
  // Store-level
  STORE_CREATE = "STORE_CREATE",
  STORE_UPDATE = "STORE_UPDATE",
  STORE_DELETE = "STORE_DELETE",
  STORE_SETTINGS = "STORE_SETTINGS",
  
  // Product management
  PRODUCT_CREATE = "PRODUCT_CREATE",
  PRODUCT_UPDATE = "PRODUCT_UPDATE",
  PRODUCT_DELETE = "PRODUCT_DELETE",
  PRODUCT_VIEW = "PRODUCT_VIEW",
  
  // Inventory
  INVENTORY_MANAGE = "INVENTORY_MANAGE",
  INVENTORY_VIEW = "INVENTORY_VIEW",
  
  // Orders
  ORDER_VIEW = "ORDER_VIEW",
  ORDER_FULFILL = "ORDER_FULFILL",
  ORDER_REFUND = "ORDER_REFUND",
  
  // Analytics
  ANALYTICS_VIEW = "ANALYTICS_VIEW",
  FINANCIAL_VIEW = "FINANCIAL_VIEW",
  
  // Customer-facing
  CUSTOMER_BROWSE = "CUSTOMER_BROWSE",
  CUSTOMER_PURCHASE = "CUSTOMER_PURCHASE",
  CUSTOMER_REVIEW = "CUSTOMER_REVIEW",
}

/** ENUM FOR GENDER */
export enum Gender {
  Male = "Male",
  Female = "Female",
}

export enum TWOFA {
  MAIL = "MAIL",
  SMS = "SMS",
  APP = "APP",
}

export interface IUser extends Document {
  userType: UserType;
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  password: string;
  /** Common Contact Information */
  address?: string;
  firstName?: string;
  lastName?: string;
  profileImage: string;
  gender?: Gender;
  nationality?: string;
  lastActiveAt?: Date;
  isEmailVerified: boolean;
  falseIdentificationFlag: boolean;

  // tenant metadata
  tenantId: string;
  tenantType: TenantType;
  tenantStatus: TenantStatus;
  tenantPlan: BillingPlan;
  trialEndsAt?: Date;
  currentPeriodEndsAt?: Date;
  cancelAtPeriodEnd: boolean;

  limits: {
    stores: number;
    products: number;
    teamMembers: number;
    apiCallsPerMonth: number;
  };
}

const UserSchema = new Schema<IUser>(
  {
    userType: {
      type: String,
      enum: Object.values(UserType),
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type: String,
      required: true,
      match: [
        /^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/,
        "Phone must be a valid number with an optional country code (e.g., +2348100099551)",
      ],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    address: { type: String, trim: true },
    profileImage: { type: String },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },

    tenantType: {
      type: String,
      enum: Object.values(TenantType),
    },
    tenantId:String,
    tenantStatus: {
      type: String,
      enum: Object.values(TenantStatus),
      default: TenantStatus.DRAFT,
    },
    tenantPlan: {
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

    gender: {
      type: String,
      enum: Object.values(Gender),
    },
    lastActiveAt: {
      type: Date,
    },
    falseIdentificationFlag: Boolean,
    isEmailVerified: Boolean,
  },
  { timestamps: true }
);
UserSchema.index({
  createdAt: -1,
  userType: 1,
  institutionType: 1,
});
UserSchema.index({ createdAt: -1, firstName: 1 });
UserSchema.index({ createdAt: -1, email: 1 });
UserSchema.index({ createdAt: -1, role: 1 });

UserSchema.pre<IUser>("save", function (next) {
  if (this.isModified() || this.isNew) {
    this.lastActiveAt = new Date();
  }
  next();
});

export default mongoose.model<IUser>("User", UserSchema);
