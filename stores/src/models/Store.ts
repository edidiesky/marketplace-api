import mongoose, { Document, Schema, Types } from "mongoose";

export enum StorePlanEnum {
  free = "free",
  basic = "basic",
  premium = "premium",
  enterprise = "enterprise",
}


export interface IStore {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  ownerName: string;
  ownerEmail: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  domain?: string;
  subdomain: string;
  email: string;
  phoneNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  settings: {
    currency: string;
    timezone: string;
    taxRate: number;
    shippingMethods: Array<{
      name: string;
      rate: number;
      estimatedDays: number;
    }>;
    paymentMethods: string[];
  };
  isActive: boolean;
  isPremium: boolean;
  plan: StorePlanEnum;
  subscription: {
    startDate: Date;
    endDate?: Date;
    status: "active" | "expired" | "cancelled";
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
  };
  createdAt: Date;
  updatedAt: Date;
  notificationId:string;
}

const StoreSchema = new Schema<IStore>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    logo: String,
    banner: String,
    domain: {
      type: String,
      unique: true,
      sparse: true,
    },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
    },
    phoneNumber: String,
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
    settings: {
      currency: { type: String, default: "USD" },
      timezone: { type: String, default: "UTC" },
      taxRate: { type: Number, default: 0, min: 0, max: 100 },
      shippingMethods: [
        {
          name: String,
          rate: Number,
          estimatedDays: Number,
        },
      ],
      paymentMethods: [{ type: String }],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    plan: {
      type: String,
      enum: Object.values(StorePlanEnum),
      default: StorePlanEnum.free,
    },
    subscription: {
      startDate: { type: Date, default: Date.now },
      endDate: Date,
      status: {
        type: String,
        enum: ["active", "expired", "cancelled"],
        default: "active",
      },
    },
    stats: {
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalProducts: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

StoreSchema.index({ ownerId: 1, isActive: 1 });
StoreSchema.index({ subdomain: 1 });

export default mongoose.model<IStore>("Store", StoreSchema);
