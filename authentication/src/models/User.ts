import mongoose, { Schema, Document } from "mongoose";

/** ENUM FOR Verification Status */
export enum VerificationStatus {
  VERIFIED = "VERIFIED",
  UNVERIFIED = "UNVERIFIED",
  FAILED = "FAILED",
  PENDING = "PENDING",
}
export enum UserType {
  INDIVIDUAL = "INDIVIDUAL",
  COMPANY = "COMPANY",
  MDA = "MDA",
  ADMIN = "ADMIN",
  AKIRS = "AKIRS",
  AGENT = "AGENT",
  WHT = "WHT",
  PAYE = "PAYE",
  AGENCY = "AGENCY",
  ASSESSMENT = "ASSESSMENT",
  GROUPS = "GROUPS",
  CHAIRMAN = "CHAIRMAN",
  FEDERAL = "FEDERAL",
  STATE = "STATE",
  LOCALGOVT = "LOCALGOVT",
  SUPERADMIN = "SUPERADMIN",
}

export enum RoleLevel {
  SUPER_ADMIN = 1,
  EXECUTIVE = 2,
  DIRECTORATE_HEAD = 3,
  DEPUTY_DIRECTOR = 4,
  ASSISTANT_DIRECTOR = 5,
  PRINCIPAL_OFFICER = 6,
  SENIOR_OFFICER = 7,
  OFFICER = 8,
  MEMBER = 9,
}

export enum Permission {
  CREATE_USER = "CREATE_USER",
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
      // required: function (this: IUser) {
      //   return this.userType === UserType.INDIVIDUAL;
      // },
    },
    middleName: { type: String, trim: true },
    lastName: {
      type: String,
      trim: true,
      // required: function (this: IUser) {
      //   return this.userType === UserType.INDIVIDUAL;
      // },
    },
    dateOfBirth: {
      type: String,
      // required: function (this: IUser) {
      //   return this.userType === UserType.INDIVIDUAL;
      // },
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
      // required: function (this: IUser) {
      //   return this.userType === UserType.INDIVIDUAL;
      // },
    },
    maritalStatus: {
      type: String,
      enum: Object.values(MaritalStatus),
      // required: function (this: IUser) {
      //   return this.userType === UserType.INDIVIDUAL;
      // },
    },
    lastActiveAt: {
      type: Date,
    },
    falseIdentificationFlag: Boolean,
  },
  { timestamps: true }
);
UserSchema.index({
  createdAt: 1,
  userType: 1,
  institutionType: 1,
});
UserSchema.index({ cacNumber: 1 }, { sparse: true });
UserSchema.index({ nin: 1 }, { sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ firstName: 1 }, { sparse: true });

UserSchema.pre<IUser>("save", function (next) {
  if (this.isModified() || this.isNew) {
    this.lastActiveAt = new Date();
  }
  next();
});

export default mongoose.model<IUser>("User", UserSchema);
