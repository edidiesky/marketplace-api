import mongoose, { Schema, Document, Types } from "mongoose";

export enum UserType {
  SELLER_ADMIN   = "seller:admin",
  SELLER_MEMBER  = "seller:member",
  SELLER_VIEWER  = "seller:viewer",
  PLATFORM_ADMIN = "platform:admin",
  PLATFORM_STAFF = "platform:staff",
  CUSTOMER       = "customer",
  INVESTOR       = "investor",
  ADVISOR        = "advisor",
  SYSTEM         = "system",
}

export enum UserStatus {
  ACTIVE    = "active",
  INACTIVE  = "inactive",
  SUSPENDED = "suspended",
  DRAFT     = "draft",
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

export enum Gender {
  MALE   = "Male",
  FEMALE = "Female",
}

export enum TwoFAMethod {
  MAIL = "MAIL",
  SMS  = "SMS",
  APP  = "APP",
}

export interface IUser extends Document {
  _id:                     Types.ObjectId;
  userType:                UserType;
  email:                   string;
  phone:                   string;
  passwordHash:            string;
  firstName?:              string;
  lastName?:               string;
  profileImage?:           string;
  gender?:                 Gender;
  nationality?:            string;
  address?:                string;
  organizationId?:         string;
  organizationType:        OrganizationType;
  status:                  UserStatus;
  isEmailVerified:         boolean;
  isTwoFAEnabled:          boolean;
  twoFAMethod?:            TwoFAMethod;
  twoFASecret?:            string;
  falseIdentificationFlag: boolean;
  lastActiveAt?:           Date;
  createdAt:               Date;
  updatedAt:               Date;
}

const UserSchema = new Schema<IUser>(
  {
    userType: {
      type:     String,
      enum:     Object.values(UserType),
      required: true,
    },
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type:     String,
      required: true,
      match: [
        /^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/,
        "Phone must be a valid number with country code",
      ],
    },
    passwordHash:    { type: String, required: true, select: false },
    firstName:       { type: String, trim: true },
    lastName:        { type: String, trim: true },
    profileImage:    { type: String },
    gender:          { type: String, enum: Object.values(Gender) },
    nationality:     { type: String, trim: true },
    address:         { type: String, trim: true },
    organizationId:  {
      type:  String,
      index: true,
    },
    organizationType: {
      type: String,
      enum: Object.values(OrganizationType),
    },
    status: {
      type:    String,
      enum:    Object.values(UserStatus),
      default: UserStatus.DRAFT,
      index:   true,
    },
    isEmailVerified:         { type: Boolean, default: false },
    isTwoFAEnabled:          { type: Boolean, default: false },
    twoFAMethod:             { type: String, enum: Object.values(TwoFAMethod) },
    twoFASecret:             { type: String, select: false },
    falseIdentificationFlag: { type: Boolean, default: false },
    lastActiveAt:            { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ organizationId: 1, status: 1 });
UserSchema.index({ userType: 1, createdAt: -1 });

UserSchema.pre("save", function () {
  if (this.isModified() || this.isNew) {
    this.lastActiveAt = new Date();
  }
});

export default mongoose.model<IUser>("User", UserSchema);