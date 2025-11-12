import mongoose, { Schema, Document } from "mongoose";

/** ENUM FOR Verification Status */
export enum VerificationStatus {
  VERIFIED = "VERIFIED",
  UNVERIFIED = "UNVERIFIED",
  FAILED = "FAILED",
  PENDING = "PENDING",
}
export enum UserType {
  SELLERS = "SELLERS",
  ADMIN = "ADMIN",
  INVESTORS = "INVESTORS",
  CUSTOMER = "CUSTOMER",
}

export enum RoleLevel {
  SUPER_ADMIN = 1,
  EXECUTIVE = 2,
  DIRECTORATE_HEAD = 3,
  MEMBER = 4,
}

export enum Permission {
  CREATE_USER = "CREATE_USER",
  MANAGE_ROLES = "MANAGE_ROLES",
  READ_USER = "READ_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
  VIEW_REPORTS = "VIEW_REPORTS",
}

/** ENUM FOR GENDER */
export enum Gender {
  Male = "Male",
  Female = "Female",
}

/** ENUM FOR TWO-FACTOR AUTHENTICATION */
export enum TWOFA {
  MAIL = "MAIL",
  SMS = "SMS",
  APP = "APP",
}

/** ENUM FOR Marital Status */
export enum MaritalStatus {
  SINGLE = "SINGLE",
  MARRIED = "MARRIED",
  DIVORCED = "DIVORCED",
}

export enum NationalType {
  NIGERIAN = "NIGERIAN",
  FOREIGN = "FOREIGN",
}
export interface IUser extends Document {
  userType: UserType;
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  authOptions: TWOFA;
  password: string;
  /** Common Contact Information */
  address?: string;
  lga: string;
  occupation?: string;
  state: string;
  position?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  // dateOfBirth?: Date;
  dateOfBirth?: string;
  profileImage: string;
  gender?: Gender;
  nationality?: string;
  maritalStatus?: MaritalStatus;
  lastActiveAt?: Date;
  falseIdentificationFlag: boolean;
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

    // Common fields
    address: { type: String, trim: true },
    lga: {
      type: String,
      trim: true,
    },
    profileImage: { type: String },
    firstName: {
      type: String,
      trim: true,
    },
    middleName: { type: String, trim: true },
    lastName: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: String,
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
    },
    maritalStatus: {
      type: String,
      enum: Object.values(MaritalStatus),
    },
    lastActiveAt: {
      type: Date,
    },
    falseIdentificationFlag: Boolean,
  },
  { timestamps: true }
);
UserSchema.index({
  createdAt: -1,
  userType: 1,
  institutionType: 1,
});
UserSchema.index({createdAt: -1, firstName: 1 });
UserSchema.index({createdAt: -1, email: 1 });

UserSchema.pre<IUser>("save", function (next) {
  if (this.isModified() || this.isNew) {
    this.lastActiveAt = new Date();
  }
  next();
});

export default mongoose.model<IUser>("User", UserSchema);
