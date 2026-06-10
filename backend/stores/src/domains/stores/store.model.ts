import mongoose, { Schema, Document, Types } from "mongoose";

export enum StoreStatus {
  DRAFT     = "draft",
  ACTIVE    = "active",
  SUSPENDED = "suspended",
  CLOSED    = "closed",
}

export enum CustomDomainStatus {
  NONE     = "none",
  PENDING  = "pending",
  VERIFIED = "verified",
  FAILED   = "failed",
}

export interface IStoreAddress {
  street:     string;
  city:       string;
  state:      string;
  country:    string;
  postalCode: string;
}

export interface IStoreSettings {
  currency:        string;
  timezone:        string;
  taxRate:         number;
  shippingMethods: Array<{
    name:          string;
    rate:          number;
    estimatedDays: number;
  }>;
  paymentMethods: string[];
}

export interface IStore extends Document {
  _id:                    Types.ObjectId;
  organizationId:         string;
  ownerId:                Types.ObjectId;
  ownerName:              string;
  ownerEmail:             string;
  name:                   string;
  subdomain:              string;
  slug:                   string;
  description?:           string;
  logo?:                  string;
  banner?:                string;
  email:                  string;
  phoneNumber?:           string;
  address:                IStoreAddress;
  settings:               IStoreSettings;
  status:                 StoreStatus;
  customDomain?:          string;
  customDomainStatus:     CustomDomainStatus;
  customDomainVerifiedAt?: Date;
  caddyRouteId?:          string;
  caddyCustomRouteId?:    string;
  notificationId?:        string;
  createdAt:              Date;
  updatedAt:              Date;
}

const StoreSchema = new Schema<IStore>(
  {
    organizationId: {
      type:     String,
      required: true,
      index:    true,
    },
    ownerId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    ownerName:  { type: String, required: false },
    ownerEmail: { type: String, required: false },
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    subdomain: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      index:     true,
    },
    slug: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
    },
    description: { type: String, maxlength: 1000 },
    logo:        { type: String },
    banner:      { type: String },
    email:       { type: String, required: true },
    phoneNumber: { type: String },
    address: {
      street:     { type: String, required: true },
      city:       { type: String, required: true },
      state:      { type: String, required: true },
      country:    { type: String, required: true },
      postalCode: { type: String, required: true },
    },
    settings: {
      currency:   { type: String, default: "NGN" },
      timezone:   { type: String, default: "Africa/Lagos" },
      taxRate:    { type: Number, default: 0, min: 0, max: 100 },
      shippingMethods: [
        {
          name:          String,
          rate:          Number,
          estimatedDays: Number,
        },
      ],
      paymentMethods: [{ type: String }],
    },
    status: {
      type:    String,
      enum:    Object.values(StoreStatus),
      default: StoreStatus.ACTIVE,
      index:   true,
    },
    customDomain: {
      type:   String,
      unique: true,
      sparse: true,
    },
    customDomainStatus: {
      type:    String,
      enum:    Object.values(CustomDomainStatus),
      default: CustomDomainStatus.NONE,
    },
    customDomainVerifiedAt: { type: Date },
    caddyRouteId:           { type: String },
    caddyCustomRouteId:     { type: String },
    notificationId:         { type: String },
  },
  { timestamps: true }
);

StoreSchema.index({ ownerId: 1, status: 1 });
StoreSchema.index({ organizationId: 1, status: 1 });
StoreSchema.index({ subdomain: 1 });

export default mongoose.model<IStore>("Store", StoreSchema);