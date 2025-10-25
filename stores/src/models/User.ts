import mongoose, { Schema, Document } from "mongoose";

export enum ComplianceStatus {
  COMPLIANT = "COMPLIANT",
  NON_COMPLIANT = "NON_COMPLIANT",
  PENDING = "PENDING",
}
/** ENUM FOR Verification Status */
export enum VerificationStatus {
  VERIFIED = "VERIFIED",
  UNVERIFIED = "UNVERIFIED",
  FAILED = "FAILED",
  PENDING = "PENDING",
}

/** ENUM FOR Audit Outcome */
export enum AuditOutcome {
  PASSED = "PASSED",
  FAILED = "FAILED",
  IN_PROGRESS = "IN_PROGRESS",
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

export enum InstitutionType {
  HOSPITAL = "hospital",
  OIL_GAS = "oil_gas",
  PETROL_STATION = "petro_station",
  BANK = "bank",
  OTHERS = "others",
}

export enum DirectorateType {
  ICT = "ICT",
  PAYE = "PAYE",
  ASSESSMENT = "ASSESSMENT",
  CHAIRMAN = "CHAIRMAN",
  BOARDS = "BOARDS",
  CONSULTANT = "CONSULTANT",
  MDA = "MDA",
  WHT = "WHT",
  GROUPS = "GROUPS",
  AGENT = "AGENT",
  BANK = "BANK",
  SCHOOL = "SCHOOL",
  TAXPAYER = "TAXPAYER",
  CHANGE = "CHANGE",
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

export enum BranchType {
  HEAD_OFFICE = "HEAD_OFFICE",
  BRANCH = "BRANCH",
}

export enum Permission {
  CREATE_USER = "CREATE_USER",
  READ_USER = "READ_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
  CREATE_TAX_FILING = "CREATE_TAX_FILING",
  READ_TAX_FILING = "READ_TAX_FILING",
  UPDATE_TAX_FILING = "UPDATE_TAX_FILING",
  DELETE_TAX_FILING = "DELETE_TAX_FILING",
  APPROVE_TAX_FILING = "APPROVE_TAX_FILING",
  CREATE_ASSESSMENT = "CREATE_ASSESSMENT",
  READ_ASSESSMENT = "READ_ASSESSMENT",
  UPDATE_ASSESSMENT = "UPDATE_ASSESSMENT",
  DELETE_ASSESSMENT = "DELETE_ASSESSMENT",
  APPROVE_ASSESSMENT = "APPROVE_ASSESSMENT",
  MANAGE_PAYE = "MANAGE_PAYE",
  PROCESS_PAYE = "PROCESS_PAYE",
  APPROVE_PAYE = "APPROVE_PAYE",
  MANAGE_SYSTEM_CONFIG = "MANAGE_SYSTEM_CONFIG",
  VIEW_SYSTEM_LOGS = "VIEW_SYSTEM_LOGS",
  MANAGE_ROLES = "MANAGE_ROLES",
  VIEW_REPORTS = "VIEW_REPORTS",
  CREATE_REPORTS = "CREATE_REPORTS",
  EXPORT_DATA = "EXPORT_DATA",
  MANAGE_MDA = "MANAGE_MDA",
  APPROVE_MDA_REQUESTS = "APPROVE_MDA_REQUESTS",
  CREATE_GROUP = "CREATE_GROUP",
  MANAGE_GROUP = "MANAGE_GROUP",
  DELETE_GROUP = "DELETE_GROUP",
  MANAGE_PERMISSIONS = "MANAGE_PERMISSIONS",
  VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS",
  MANAGE_TAX_STATIONS = "MANAGE_TAX_STATIONS",
  CREATE_ADMIN_ASSESSMENT = "CREATE_ADMIN_ASSESSMENT",
  REVIEW_TCC = "REVIEW_TCC",
  REQUEST_TCC = "REQUEST_TCC",
  APPROVE_TCC = "APPROVE_TCC",
  ISSUE_TCC = "ISSUE_TCC",
  VIEW_TCC = "VIEW_TCC",
  CREATE_BULK_TCC = "CREATE_BULK_TCC",
}

/** ENUM FOR GENDER */
export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
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
  single = "single",
  Single = "Single",
  married = "married",
  Married = "Married",
  divorced = "divorced",
}

/** ENUM FOR Proof Of Residency */
export enum ProofOfResidency {
  UTILITY_BILL = "UTILITY_BILL",
  LEASE_AGREEMENT = "LEASE_AGREEMENT",
  BANK_STATEMENT = "BANK_STATEMENT",
}

export interface IRevenueLine {
  name: string;
  type:
    | "FEES"
    | "TAXES"
    | "LICENSES"
    | "SALES"
    | "FINES"
    | "EARNINGS"
    | "RENT"
    | "INTEREST";
}

export interface IComplianceCheck {
  date: Date;
  status: ComplianceStatus;
  notes?: string;
  falseIdentification?: boolean;
}

export interface IAuditRecord {
  date: Date;
  outcome: AuditOutcome;
  details?: string;
  penaltyAmount?: number;
}

export enum NationalType {
  NIGERIAN = "NIGERIAN",
  FOREIGN = "FOREIGN",
}
export interface IUser extends Document {
  userType: UserType;
  tin: string;
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  authOptions: TWOFA;
  password: string;

  nationalType?: NationalType;
  bvn?: string;

  /** Common Contact Information */
  address?: string;
  lga: string;
  occupation?: string;
  state: string;
  position?: string;
  proofOfResidency?: ProofOfResidency;
  groupTin?: string;
  groupName?: string;

  secondaryPhone?: string;
  natureOfBusiness?: string;
  uploadedFile?: string;
  profileImage?: string;
  businessSector: string;

  /** Individual-Specific Fields */
  firstName?: string;
  plaintextPassword?: string;
  middleName?: string;
  lastName?: string;
  // dateOfBirth?: Date;
  dateOfBirth?: string;
  gender?: Gender;
  nationality?: string;
  maritalStatus?: MaritalStatus;
  lgaOfResidence?: string;
  headOfficeAddress: string;
  nin?: string;
  employerTin?: string;
  employmentStatus?: string;

  /** Company-Specific Fields */
  companyName?: string;
  cacNumber?: string;
  companyType?: string;
  registrationDate?: Date;
  companyEmail?: string;
  city?: string;
  stateOfResidence?: string;
  currentAddress: string;
  employerName: string;
  institutionType: InstitutionType;
  parentCompanyTin?: string;
  branchType?: BranchType;
  // Oil and Gas specific fields
  lgaOfOperation?: string;

  //Bank specific fields
  bankOperationalName?: string;
  bankIsBranchOffice?: boolean;
  bankBranchLocation?: string;

  //Oil and Gas specific fields
  oilGasOperationalName?: string;

  //Petrol Station specific fields
  petroOperationalName?: string;
  petroIsBranchOffice?: boolean;
  petroBranchLocation?: string;
  numberOfPumps?: string;

  // Existing institution fields
  operateMortuary: boolean;
  runLaboratory: boolean;
  operationalZone: string;
  bankName: string;
  isBranchOffice: boolean;
  branchLocation: string;
  numberOfBeds: string;
  oilGasCompanyName: string;
  oilGasIsBranchOffice: boolean;
  oilGasBranchLocation: string;
  hospitalIsBranchOffice: boolean;
  hospitalBranchLocation: string;

  // Federal Agency Specific fields
  isSubOffice: boolean;
  subOfficeAddress: string;

  /** Agent-Specific Fields */
  agencyName?: string;

  // Agent-specific
  licenseNumber?: string;
  assignedTaxpayers?: mongoose.Types.ObjectId[];
  hospitalTin: mongoose.Types.ObjectId;
  schoolTin: mongoose.Types.ObjectId;
  bankTin: mongoose.Types.ObjectId;

  /** Compliance Data */
  lastComplianceCheck?: Date;

  requestId?: string;
  lastActiveAt?: Date;
  compliance: number;

  complianceStatus?: ComplianceStatus;
  complianceScore: number;
  complianceHistory?: IComplianceCheck[];
  falseIdentificationFlag?: boolean;
  verificationStatus?: VerificationStatus;
  auditHistory?: IAuditRecord[];
  penalties?: number;
  outstandAmount: number;
  rowCount: number;
  directorate: DirectorateType;
}

const UserSchema = new Schema<IUser>(
  {
    userType: {
      type: String,
      enum: Object.values(UserType),
      required: true,
    },
    tin: {
      type: String,
      required: true,
      unique: true,
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
    authOptions: {
      type: String,
      enum: Object.values(TWOFA),
      default: TWOFA.MAIL,
    },

    // Common fields
    address: { type: String, trim: true },
    lga: {
      type: String,
      trim: true,
    },
    occupation: { type: String, trim: true },
    state: {
      type: String,
      trim: true,
    },
    proofOfResidency: {
      type: String,
      enum: Object.values(ProofOfResidency),
    },
    
    secondaryPhone: {
      type: String,
      match: [
        /^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/,
        "Secondary phone must be a valid number with an optional country code",
      ],
    },
    natureOfBusiness: { type: String, trim: true },
    uploadedFile: { type: String },
    profileImage: { type: String },
    businessSector: { type: String, trim: true },
    // Individual-specific fields
    firstName: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return this.userType === UserType.INDIVIDUAL;
      },
    },
    middleName: { type: String, trim: true },
    lastName: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return this.userType === UserType.INDIVIDUAL;
      },
    },
    dateOfBirth: {
      type: String,
      required: function (this: IUser) {
        return this.userType === UserType.INDIVIDUAL;
      },
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
      required: function (this: IUser) {
        return this.userType === UserType.INDIVIDUAL;
      },
    },
    nationality: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return this.userType === UserType.INDIVIDUAL;
      },
    },
    maritalStatus: {
      type: String,
      enum: Object.values(MaritalStatus),
      required: function (this: IUser) {
        return this.userType === UserType.INDIVIDUAL;
      },
    },
    // In UserSchema, add to individual-specific fields:
    nationalType: {
      type: String,
      enum: Object.values(NationalType),
      default: NationalType.NIGERIAN,
      required: function (this: IUser) {
        return this.userType === UserType.INDIVIDUAL;
      },
    },
    bvn: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^[0-9]{11}$/, "BVN must be an 11-digit number"],
      required: function (this: IUser) {
        return (
          this.userType === UserType.INDIVIDUAL &&
          this.nationalType === NationalType.FOREIGN
        );
      },
    },

    // Update existing nin to be conditional (optional for foreigners):
    nin: {
      type: String,
      // unique: true,
      // sparse: true,
      required: function (this: IUser) {
        return (
          this.userType === UserType.INDIVIDUAL &&
          this.nationalType === NationalType.NIGERIAN
        );
      },
    },
    employerTin: { type: String, trim: true },
    employmentStatus: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return this.userType === UserType.INDIVIDUAL;
      },
    },
    lgaOfResidence: { type: String, trim: true },
    stateOfResidence: { type: String, trim: true },
    employerName: { type: String, trim: true },

    // Company-specific fields
    companyName: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return this.userType === UserType.COMPANY;
      },
    },
    cacNumber: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return this.userType === UserType.COMPANY;
      },
      // unique: true,
      // sparse: true,
    },
    companyType: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return this.userType === UserType.COMPANY;
      },
    },
    registrationDate: {
      type: Date,
      required: function (this: IUser) {
        return this.userType === UserType.COMPANY;
      },
    },

    companyEmail: {
      type: String,
      required: function (this: IUser) {
        return this.userType === UserType.COMPANY;
      },
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid company email address",
      ],
    },
    city: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return this.userType === UserType.COMPANY;
      },
    },
    headOfficeAddress: { type: String, trim: true },
    currentAddress: { type: String, trim: true },

    // Company operational fields
    institutionType: {
      type: String,
      enum: Object.values(InstitutionType),
      required: function (this: IUser) {
        return this.userType === UserType.COMPANY;
      },
    },

    parentCompanyTin: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.branchType === BranchType.BRANCH
        );
      },
    },
    // parentCompanyId
    lgaOfOperation: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return this.userType === UserType.COMPANY;
      },
    },
    operationalZone: {
      type: String,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY ||
          this.userType === UserType.STATE ||
          this.userType === UserType.LOCALGOVT ||
          this.userType === UserType.FEDERAL
        );
      },
    },

    // Fedeeral Agenxy specific fields

    isSubOffice: {
      type: Boolean,
      required: function (this: IUser) {
        return this.userType === UserType.FEDERAL;
      },
    },
    // subOfficeAddress
    subOfficeAddress: {
      type: String,
      // required: function (this: IUser) {
      //   return this.userType === UserType.FEDERAL;
      // },
    },

    // isBranchOffice
    hospitalIsBranchOffice: {
      type: Boolean,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.HOSPITAL
        );
      },
    },
    // Hospital-specific fields
    numberOfBeds: {
      type: String,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.HOSPITAL
        );
      },
    },
    operateMortuary: {
      type: Boolean,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.HOSPITAL
        );
      },
    },
    runLaboratory: {
      type: Boolean,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.HOSPITAL
        );
      },
    },

    // Bank-specific fields
    bankOperationalName: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.BANK
        );
      },
    },
    bankIsBranchOffice: {
      type: Boolean,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.BANK
        );
      },
    },
    bankBranchLocation: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.BANK &&
          this.bankIsBranchOffice === true
        );
      },
    },

    // Oil and Gas specific fields
    oilGasOperationalName: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.OIL_GAS
        );
      },
    },
    oilGasIsBranchOffice: {
      type: Boolean,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.OIL_GAS
        );
      },
    },
    hospitalBranchLocation: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.HOSPITAL &&
          this.hospitalIsBranchOffice === true
        );
      },
    },
    oilGasBranchLocation: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.OIL_GAS &&
          this.oilGasIsBranchOffice === true
        );
      },
    },

    // Petrol Station specific fields
    petroOperationalName: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.PETROL_STATION
        );
      },
    },
    petroIsBranchOffice: {
      type: Boolean,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.PETROL_STATION
        );
      },
    },
    petroBranchLocation: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.PETROL_STATION &&
          this.petroIsBranchOffice === true
        );
      },
    },
    numberOfPumps: {
      type: String,
      required: function (this: IUser) {
        return (
          this.userType === UserType.COMPANY &&
          this.institutionType === InstitutionType.PETROL_STATION
        );
      },
    },
    // Compliance and other fields
    complianceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    complianceStatus: {
      type: String,
      enum: Object.values(ComplianceStatus),
      default: ComplianceStatus.PENDING,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
    },
    requestId: { type: String },
    lastActiveAt: { type: Date },
    directorate: {
      type: String,
      enum: Object.values(DirectorateType),
      default: DirectorateType.TAXPAYER,
    },
    // outstandAmount
    outstandAmount: { type: Number, default: 0 },
    penalties: { type: Number, default: 0 },
    falseIdentificationFlag: { type: Boolean, default: false },
    // Agency/MDA fields
    agencyName: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return [
          UserType.MDA,
          UserType.STATE,
          UserType.LOCALGOVT,
          UserType.FEDERAL,
        ].includes(this.userType);
      },
    },
    licenseNumber: {
      type: String,
      trim: true,
      required: function (this: IUser) {
        return this.userType === UserType.AGENT;
      },
    },
    groupTin: { type: String, trim: true },
    groupName: { type: String, trim: true },
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
UserSchema.index({ firstName: 1, lastName: 1 }, { sparse: true });
UserSchema.index({ companyName: 1 }, { sparse: true });
UserSchema.index({ stateOfResidence: 1 }, { sparse: true });
UserSchema.index({ tin: 1 }, { sparse: true });
UserSchema.index({ bvn: 1 }, { unique: true, sparse: true });

UserSchema.pre<IUser>("save", function (next) {
  if (this.isModified() || this.isNew) {
    this.lastActiveAt = new Date();
  }
  next();
});

export default mongoose.model<IUser>("User", UserSchema);




const data1 = {
    "userType": "COMPANY",
    "tin": "COM-TEST001",
    "email": "testcompany1@example.com",
    "phone": "+2348012345678",
    "passwordHash": "$2b$10$randomhashedpassword123...",
    "authOptions": "MAIL",
    "password": "TempPass123!",
    "companyName": "Test Company Ltd",
    "cacNumber": "RC1234567",
    "companyType": "Limited Company",
    "registrationDate": "2020-01-15T00:00:00.000Z",
    "companyEmail": "info@testcompany.com",
    "city": "Lagos",
    "lgaOfOperation": "Ikeja",
    "state": "Lagos",
    "currentAddress": "12, Test Street, Ikeja",
    "institutionType": "others",
    "branchType": "HEAD_OFFICE",
    "operationalZone": "Zone 1",
    "businessSector": "Technology",
    "address": "12, Test Street, Ikeja",
    "complianceScore": 75,
    "complianceStatus": "PENDING",
    "verificationStatus": "PENDING",
    "outstandAmount": 0,
    "penalties": 0,
    "falseIdentificationFlag": false,
    "directorate": "TAXPAYER",
    "rowCount": 1
  }