import {
  DirectorateType,
  Gender,
  InstitutionType,
  MaritalStatus,
  NationalType,
  Permission,
  ProofOfResidency,
  RoleLevel,
  TWOFA,
  UserType,
} from "../models/User";
import Joi from "joi";
export const loginSchema = Joi.object({
  tin: Joi.string().required(),
  password: Joi.string().min(5).required(),
});

export const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(5).required(),
});

export const uploadSchema = Joi.object({
  name: Joi.string().required(),
  csvUrl: Joi.string().required(),
  publicId: Joi.string().required(),
});
// UploadBulkCompanyCSVHandler
export const UploadBulkCompanyCSVHandlerSchema = Joi.object({
  institutionType: Joi.string().required(),
  requestId: Joi.string().required(),
  csvUrl: Joi.string().required(),
  publicId: Joi.string().required(),
});
export const requestPasswordResetSchema = Joi.object({
  tin: Joi.string().min(5).required(),
});

export const signupSchema = Joi.object({
  userType: Joi.string()
    .valid(
      ...Object.values(UserType).filter((type) =>
        [UserType.INDIVIDUAL, UserType.COMPANY].includes(type)
      )
    )
    .required()
    .messages({
      "any.only": `User type must be one of ${[
        UserType.INDIVIDUAL,
        UserType.COMPANY,
      ].join(", ")}`,
      "any.required": "User type is required",
    }),

  // Common fields
  nationalType: Joi.string()
    .valid(...Object.values(NationalType))
    .when("userType", {
      is: UserType.INDIVIDUAL,
      then: Joi.required().messages({
        "any.required": "National type is required for individuals",
        "any.only": `National type must be one of ${Object.values(
          NationalType
        ).join(", ")}`,
      }),
      otherwise: Joi.forbidden(),
    }),

  bvn: Joi.string()
    .pattern(/^[0-9]{11}$/)
    .when("userType", {
      is: UserType.INDIVIDUAL,
      then: Joi.when("nationalType", {
        is: NationalType.FOREIGN,
        then: Joi.required().messages({
          "any.required": "BVN is required for Nigerian individuals",
          "string.pattern.base": "BVN must be an 11-digit number",
        }),
        otherwise: Joi.optional(),
      }),
      otherwise: Joi.forbidden(),
    }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .lowercase()
    .trim()
    .messages({
      "string.email": "Must be a valid email address",
      "any.required": "Email is required",
    }),
  groupTin: Joi.string().optional(),
  phone: Joi.string()
    .trim()
    .pattern(/^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone must be a valid number with an optional country code (e.g., +2348100099551)",
      "any.required": "Phone is required",
    }),

  address: Joi.string().trim().optional(),
  lga: Joi.string().trim().required().messages({
    "any.required": "LGA is required",
  }),
  state: Joi.string().trim().required().messages({
    "any.required": "State is required",
  }),
  occupation: Joi.string().trim().optional(),
  proofOfResidency: Joi.string()
    .valid(...Object.values(ProofOfResidency))
    .required()
    .messages({
      "any.only": `Proof of residency must be one of ${Object.values(
        ProofOfResidency
      ).join(", ")}`,
      "any.required": "Proof of residency is required",
    }),
  secondaryPhone: Joi.string()
    .trim()
    .pattern(/^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "Secondary phone must be a valid number with an optional country code (e.g., +2348100099551)",
    }),
  natureOfBusiness: Joi.string().trim().optional(),
  businessSector: Joi.string().trim().optional(),
  uploadedFile: Joi.string().optional(),
  profileImage: Joi.string().optional(),

  // Individual-specific fields
  firstName: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.INDIVIDUAL,
      then: Joi.required().messages({
        "any.required": "First name is required",
      }),
      otherwise: Joi.forbidden(),
    }),
  middleName: Joi.string().trim().optional(),
  lastName: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.INDIVIDUAL,
      then: Joi.required().messages({
        "any.required": "Last name is required",
      }),
      otherwise: Joi.forbidden(),
    }),

  dateOfBirth: Joi.string().when(Joi.ref("userType"), {
    is: UserType.INDIVIDUAL,
    then: Joi.required().messages({
      "any.required": "Date of birth is required",
      "string.isoDate": "Date of birth must be a valid ISO date",
    }),
    otherwise: Joi.forbidden(),
  }),

  gender: Joi.string()
    .valid(...Object.values(Gender))
    .when(Joi.ref("userType"), {
      is: UserType.INDIVIDUAL,
      then: Joi.required().messages({
        "any.required": "Gender is required",
        "any.only": `Gender must be one of ${Object.values(Gender).join(", ")}`,
      }),
      otherwise: Joi.forbidden(),
    }),

  nationality: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.INDIVIDUAL,
      then: Joi.required().messages({
        "any.required": "Nationality is required",
      }),
      otherwise: Joi.forbidden(),
    }),

  maritalStatus: Joi.string()
    .valid(...Object.values(MaritalStatus))
    .when(Joi.ref("userType"), {
      is: UserType.INDIVIDUAL,
      then: Joi.required().messages({
        "any.required": "Marital status is required",
        "any.only": `Marital status must be one of ${Object.values(
          MaritalStatus
        ).join(", ")}`,
      }),
      otherwise: Joi.forbidden(),
    }),

  nin: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.INDIVIDUAL,
      then: Joi.when("nationalType", {
        is: NationalType.NIGERIAN,
        then: Joi.required().messages({
          "any.required": "NIN is required for Nigerian individuals",
        }),
        otherwise: Joi.optional(),
      }),
      otherwise: Joi.forbidden(),
    }),

  employmentStatus: Joi.string()
    .valid("EMPLOYED", "SELF_EMPLOYED", "UNEMPLOYED", "RETIRED")
    .when(Joi.ref("userType"), {
      is: UserType.INDIVIDUAL,
      then: Joi.required().messages({
        "any.required": "Employment status is required",
        "any.only":
          "Employment status must be one of: EMPLOYED, SELF_EMPLOYED, UNEMPLOYED, RETIRED",
      }),
      otherwise: Joi.forbidden(),
    }),

  employerTin: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.INDIVIDUAL,
      then: Joi.when(Joi.ref("employmentStatus"), {
        is: "EMPLOYED",
        then: Joi.required().messages({
          "any.required": "Employer TIN is required when employed",
        }),
        otherwise: Joi.optional(),
      }),
      otherwise: Joi.forbidden(),
    }),

  lgaOfResidence: Joi.string().trim().optional(),
  stateOfResidence: Joi.string().trim().optional(),

  // Company-specific fields
  companyName: Joi.string()
    .trim()
    .max(200)
    .when(Joi.ref("userType"), {
      is: UserType.COMPANY,
      then: Joi.required().messages({
        "any.required": "Company name is required",
        "string.max": "Company name must not exceed 200 characters",
      }),
      otherwise: Joi.forbidden(),
    }),

  cacNumber: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.COMPANY,
      then: Joi.required().messages({
        "any.required": "CAC number is required",
        "string.pattern.base": "CAC number must follow the format AB12345678",
      }),
      otherwise: Joi.forbidden(),
    }),
  parentCompanyId: Joi.string()
    .trim()
    .when("userType", {
      is: UserType.COMPANY,
      then: Joi.when("institutionType", {
        is: Joi.valid("bank", "oil_gas", "petro_station"),
        then: Joi.when("bankIsBranchOffice", {
          is: true,
          then: Joi.when("oilGasIsBranchOffice", {
            is: true,
            then: Joi.when("petroIsBranchOffice", {
              is: true,
              then: Joi.required().messages({
                "any.required":
                  "Parent company ID is required for branch offices",
              }),
              otherwise: Joi.optional(),
            }),
            otherwise: Joi.optional(),
          }),
          otherwise: Joi.optional(),
        }),
        otherwise: Joi.optional(),
      }),
      otherwise: Joi.forbidden(),
    }),

  companyType: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.COMPANY,
      then: Joi.required().messages({
        "any.required": "Company type is required",
      }),
      otherwise: Joi.forbidden(),
    }),

  registrationDate: Joi.string().when(Joi.ref("userType"), {
    is: UserType.COMPANY,
    then: Joi.required().messages({
      "any.required": "Registration date is required",
      "string.isoDate": "Registration date must be a valid ISO date",
    }),
    otherwise: Joi.forbidden(),
  }),

  companyEmail: Joi.string()
    .email({ tlds: { allow: false } })
    .when(Joi.ref("userType"), {
      is: UserType.COMPANY,
      then: Joi.required().messages({
        "any.required": "Company email is required",
        "string.email": "Must be a valid company email address",
      }),
      otherwise: Joi.forbidden(),
    }),

  city: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.COMPANY,
      then: Joi.required().messages({
        "any.required": "City is required",
      }),
      otherwise: Joi.forbidden(),
    }),

  headOfficeAddress: Joi.string().trim().optional(),
  currentAddress: Joi.string().trim().optional(),

  // Enhanced company-specific operational fields
  lgaOfOperation: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.COMPANY,
      then: Joi.required().messages({
        "any.required": "LGA of Operation is required",
      }),
      otherwise: Joi.forbidden(),
    }),

  operationalZone: Joi.string().when(Joi.ref("userType"), {
    is: UserType.COMPANY,
    then: Joi.required().messages({
      "any.required": "Operational Zone is required",
    }),
    otherwise: Joi.forbidden(),
  }),

  // Institution type for companies
  institutionType: Joi.string()
    .valid(...Object.values(InstitutionType))
    .when(Joi.ref("userType"), {
      is: UserType.COMPANY,
      then: Joi.required().messages({
        "any.required": "Institution Type is required",
        "any.only": `Institution type must be one of ${Object.values(
          InstitutionType
        ).join(", ")}`,
      }),
      otherwise: Joi.forbidden(),
    }),

  // Hospital-specific fields
  numberOfBeds: Joi.string().when(Joi.ref("institutionType"), {
    is: "hospital",
    then: Joi.required().messages({
      "any.required": "Number of beds is required for hospitals",
    }),
    otherwise: Joi.forbidden(),
  }),

  operateMortuary: Joi.boolean().when(Joi.ref("institutionType"), {
    is: "hospital",
    then: Joi.required().messages({
      "any.required": "Please specify if you operate a mortuary",
    }),
    otherwise: Joi.forbidden(),
  }),

  runLaboratory: Joi.boolean().when(Joi.ref("institutionType"), {
    is: "hospital",
    then: Joi.required().messages({
      "any.required": "Please specify if you run a laboratory",
    }),
    otherwise: Joi.forbidden(),
  }),

  // Bank-specific fields
  bankOperationalName: Joi.string()
    .trim()
    .when(Joi.ref("institutionType"), {
      is: "bank",
      then: Joi.required().messages({
        "any.required": "Operational name is required for banks",
      }),
      otherwise: Joi.forbidden(),
    }),

  bankIsBranchOffice: Joi.boolean().when(Joi.ref("institutionType"), {
    is: "bank",
    then: Joi.required().messages({
      "any.required": "Please specify if this is a branch office",
    }),
    otherwise: Joi.forbidden(),
  }),
  // For bankBranchLocation, we need to chain conditions
  bankBranchLocation: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.COMPANY,
      then: Joi.when(Joi.ref("institutionType"), {
        is: "bank",
        then: Joi.when(Joi.ref("bankIsBranchOffice"), {
          then: Joi.required().messages({
            "any.required":
              "Branch location is required when this is a branch office",
          }),
          otherwise: Joi.optional(),
        }),
        otherwise: Joi.forbidden(),
      }),
      otherwise: Joi.forbidden(),
    }),

  // Oil and Gas specific fields
  oilGasOperationalName: Joi.string()
    .trim()
    .when(Joi.ref("institutionType"), {
      is: "oil_gas",
      then: Joi.required().messages({
        "any.required": "Operational name is required for oil & gas companies",
      }),
      otherwise: Joi.forbidden(),
    }),

  hospitalIsBranchOffice: Joi.boolean().when(Joi.ref("institutionType"), {
    is: "hospital",
    then: Joi.required().messages({
      "any.required":
        "Please specify if this is a branch office for your hospital",
    }),
    otherwise: Joi.forbidden(),
  }),

  oilGasIsBranchOffice: Joi.boolean().when(Joi.ref("institutionType"), {
    is: "oil_gas",
    then: Joi.required().messages({
      "any.required": "Please specify if this is a branch office",
    }),
    otherwise: Joi.forbidden(),
  }),

  // For oilGasBranchLocation, chain the conditions
  oilGasBranchLocation: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.COMPANY,
      then: Joi.when(Joi.ref("institutionType"), {
        is: "oil_gas",
        then: Joi.when(Joi.ref("oilGasIsBranchOffice"), {
          is: "yes",
          then: Joi.required().messages({
            "any.required":
              "Branch location is required when this is a branch office",
          }),
          otherwise: Joi.optional(),
        }),
        otherwise: Joi.forbidden(),
      }),
      otherwise: Joi.forbidden(),
    }),

  // Petrol Station specific fields
  petroOperationalName: Joi.string()
    .trim()
    .when(Joi.ref("institutionType"), {
      is: "petro_station",
      then: Joi.required().messages({
        "any.required": "Operational name is required for petrol stations",
      }),
      otherwise: Joi.forbidden(),
    }),

  petroIsBranchOffice: Joi.boolean().when(Joi.ref("institutionType"), {
    is: "petro_station",
    then: Joi.required().messages({
      "any.required": "Please specify if this is a branch office",
    }),
    otherwise: Joi.forbidden(),
  }),

  hospitalBranchLocation: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.COMPANY,
      then: Joi.when(Joi.ref("institutionType"), {
        is: "hospital",
        then: Joi.when(Joi.ref("hospital"), {
          is: "yes",
          then: Joi.required().messages({
            "any.required":
              "Branch location is required when this is a branch office",
          }),
          otherwise: Joi.optional(),
        }),
        otherwise: Joi.forbidden(),
      }),
      otherwise: Joi.forbidden(),
    }),

  petroBranchLocation: Joi.string()
    .trim()
    .when(Joi.ref("userType"), {
      is: UserType.COMPANY,
      then: Joi.when(Joi.ref("institutionType"), {
        is: "petro_station",
        then: Joi.when(Joi.ref("petroIsBranchOffice"), {
          is: "yes",
          then: Joi.required().messages({
            "any.required":
              "Branch location is required when this is a branch office",
          }),
          otherwise: Joi.optional(),
        }),
        otherwise: Joi.forbidden(),
      }),
      otherwise: Joi.forbidden(),
    }),

  numberOfPumps: Joi.string().when(Joi.ref("institutionType"), {
    is: "petro_station",
    then: Joi.required().messages({
      "any.required": "Number of pumps is required for petrol stations",
    }),
    otherwise: Joi.forbidden(),
  }),
}).options({
  abortEarly: false,
  stripUnknown: true,
});
export const twoFASchema = Joi.object({
  userId: Joi.string().required(),
  twoFAToken: Joi.string().min(5).required(),
});

const rowSchema = Joi.object({
  FIRSTNAME: Joi.string().trim().required().messages({
    "string.empty": "First name cannot be empty",
    "any.required": "First name is required",
  }),
  LASTNAME: Joi.string().trim().required().messages({
    "string.empty": "Last name cannot be empty",
    "any.required": "Last name is required",
  }),
  MIDDLE_NAME: Joi.string().trim().optional().messages({
    "string.empty": "Middle name cannot be empty",
  }),
  EMAIL: Joi.string().trim().email().required().messages({
    "string.email": "Email must be a valid email address",
    "any.required": "Email is required",
  }),
  PHONE: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone must be a 10-15 digit number",
      "any.required": "Phone is required",
    }),
  ADDRESS: Joi.string().trim().required().messages({
    "any.required": "Address is required",
  }),
  LGA_OF_ORIGIN: Joi.string().trim().required().messages({
    "any.required": "LGA is required",
  }),
  STATE_OF_ORIGIN: Joi.string().trim().required().messages({
    "any.required": "State is required",
  }),
  DATE_OF_BIRTH: Joi.string().trim().optional().messages({
    "date.invalid": "Date of birth must be a valid date (e.g., YYYY-MM-DD)",
  }),
  GENDER: Joi.string()
    .trim()
    .valid(...Object.values(Gender))
    .required()
    .messages({
      "any.only": `Gender must be one of ${Object.values(Gender).join(", ")}`,
      "any.required": "Gender is required",
    }),
  NATIONALITY: Joi.string().trim().required().messages({
    "any.required": "Nationality is required",
  }),
  STATE_OF_RESIDENCE: Joi.string().trim().required().messages({
    "any.required": "State of residence is required",
  }),
  SECONDARY_PHONE: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,15}$/)
    .optional()
    //
    .messages({
      "string.pattern.base": "Secondary phone must be a 10-15 digit number",
    }),
  MARITAL_STATUS: Joi.string()
    .trim()
    .valid(...Object.values(MaritalStatus))
    .required()
    .messages({
      "any.only": `Marital status must be one of ${Object.values(
        MaritalStatus
      ).join(", ")}`,
      "any.required": "Marital status is required",
    }),
  LGA_OF_RESIDENCE: Joi.string().trim().optional(),
  POSITION: Joi.string().trim().optional(),
  NIN: Joi.string().trim().required().messages({
    "any.required": "NIN is required",
  }),
});

export const validateRowData = (row: any, rowCount: number) => {
  const { error } = rowSchema.validate(row, { abortEarly: false });
  if (error) {
    return {
      errors: error.details.map((err) => ({
        message: `Row ${rowCount}: ${err.message}`,
        row: rowCount,
      })),
    };
  }
  return { errors: null };
};

// Admin user registration schema
export const adminSignupSchema = Joi.object({
  userType: Joi.string()
    .valid(
      UserType.ADMIN,
      UserType.AKIRS,
      UserType.MDA,
      UserType.PAYE,
      UserType.WHT,
      UserType.ASSESSMENT,
      UserType.GROUPS,
      UserType.AGENT,
      UserType.CHAIRMAN,
      UserType.SUPERADMIN
    )
    .required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^\+?[\d\s-()]+$/)
    .required(),
  reason: Joi.string().required(), // gender
  gender: Joi.string().required(), // nin
  nin: Joi.string().required(), // nin
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  middleName: Joi.string().min(2).max(50).optional(),
  directorate: Joi.string()
    .valid(...Object.values(DirectorateType))
    .required(),
  roleCode: Joi.string().required(),
  address: Joi.string().min(5).max(200),
  lgaOfResidence: Joi.string().required(),
  stateOfResidence: Joi.string().required(),
  profileImage: Joi.string().optional(),
  uploadedFile: Joi.string().optional(),
  // Directorate-specific fields
  agencyName: Joi.when("directorate", {
    is: Joi.string().valid(DirectorateType.MDA, DirectorateType.AGENT),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  taxStationIds: Joi.when("directorate", {
    is: DirectorateType.MDA,
    then: Joi.array().items(Joi.string().hex().length(24)),
    otherwise: Joi.array().items(Joi.string().hex().length(24)).optional(),
  }),
  licenseNumber: Joi.when("directorate", {
    is: DirectorateType.AGENT,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  supervisorTin: Joi.string().optional(),
  // Role assignment scope
  scope: Joi.object({
    states: Joi.array().items(Joi.string()),
    lgas: Joi.array().items(Joi.string()),
    taxStations: Joi.array().items(Joi.string().hex().length(24)),
  }).optional(),
  // Special permissions (for custom roles)
  specialPermissions: Joi.array()
    .items(Joi.string().valid(...Object.values(Permission)))
    .optional(),
  proofOfResidency: Joi.string()
    .valid(...Object.values(ProofOfResidency))
    .required()
    .messages({
      "any.only": `Proof of residency must be one of ${Object.values(
        ProofOfResidency
      ).join(", ")}`,
      "any.required": "Proof of residency is required",
    }),
});
// Role assignment schema

export const createRoleSchema = Joi.object({
  roleCode: Joi.string().uppercase().min(3).max(20).required(),
  roleName: Joi.string().min(5).max(100).required(),
  directorate: Joi.string()
    .valid(...Object.values(DirectorateType))
    .required(),
  level: Joi.number()
    .valid(...Object.values(RoleLevel))
    .required(),
  permissions: Joi.array()
    .items(Joi.string().valid(...Object.values(Permission)))
    .min(1)
    .required(),
  description: Joi.string().max(500).optional(),
  parentRole: Joi.string().hex().length(24).optional(),
  isActive: Joi.boolean().default(true),
});

// Role assignment schema
export const roleAssignmentSchema = Joi.object({
  userId: Joi.string().required(),
  email: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  lgaOfResidence: Joi.string().required(),
  nin: Joi.string().required(),
  phone: Joi.string().required(),
  address: Joi.string().required(),
  gender: Joi.string().required(),
  roleCode: Joi.string().required(),
  effectiveFrom: Joi.date().default(() => new Date()),
  effectiveTo: Joi.date().greater(Joi.ref("effectiveFrom")).optional(),
  scope: Joi.object({
    states: Joi.array().items(Joi.string()),
    lgas: Joi.array().items(Joi.string()),
    taxStations: Joi.array().items(Joi.string().hex().length(24)),
    permissions: Joi.array().items(
      Joi.string().valid(...Object.values(Permission))
    ),
  }).optional(),
  reason: Joi.string().min(10).max(500).optional(),
});

// Role creation/update schema
export const roleManagementSchema = Joi.object({
  roleCode: Joi.string().uppercase().min(3).max(20).required(),
  roleName: Joi.string().min(5).max(100).required(),
  directorate: Joi.string()
    .valid(...Object.values(DirectorateType))
    .required(),
  level: Joi.number()
    .valid(...Object.values(RoleLevel))
    .required(),
  permissions: Joi.array()
    .items(Joi.string().valid(...Object.values(Permission)))
    .min(1)
    .required(),
  description: Joi.string().max(500).optional(),
  parentRole: Joi.string().hex().length(24).optional(),
  isActive: Joi.boolean().default(true),
});

// User profile update schema (enhanced)
export const userUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  middleName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[\d\s-()]+$/)
    .optional(),
  secondaryPhone: Joi.string()
    .pattern(/^\+?[\d\s-()]+$/)
    .optional(),
  address: Joi.string().min(10).max(200).optional(),
  lga: Joi.string().optional(),
  state: Joi.string().optional(),
  profileImage: Joi.string().optional(),
  occupation: Joi.string().max(100).optional(),
  employmentStatus: Joi.string()
    .valid("EMPLOYED", "UNEMPLOYED", "SELF_EMPLOYED")
    .optional(),
  businessSector: Joi.string().optional(),

  // Company-specific updates
  companyName: Joi.string().min(3).max(100).optional(),
  companyEmail: Joi.string().email().optional(),
  headOfficeAddress: Joi.string().max(200).optional(),

  // Validation that prevents unauthorized field updates
  tin: Joi.forbidden(),
  userType: Joi.forbidden(),
  passwordHash: Joi.forbidden(),
  createdAt: Joi.forbidden(),
  updatedAt: Joi.forbidden(),
});

// Advanced search/filtering schema
export const userSearchSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string()
    .valid(
      "createdAt",
      "firstName",
      "lastName",
      "companyName",
      "tin",
      "email",
      "lastActiveAt",
      "complianceScore"
    )
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),

  // Filtering options
  userType: Joi.array().items(Joi.string().valid(...Object.values(UserType))),
  directorate: Joi.array().items(
    Joi.string().valid(...Object.values(DirectorateType))
  ),
  state: Joi.array().items(Joi.string()),
  lga: Joi.array().items(Joi.string()),
  complianceStatus: Joi.array().items(
    Joi.string().valid("COMPLIANT", "NON_COMPLIANT", "PENDING")
  ),
  verificationStatus: Joi.array().items(
    Joi.string().valid("VERIFIED", "UNVERIFIED", "FAILED", "PENDING")
  ),
  dateRange: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().greater(Joi.ref("start")).required(),
  }),

  // Search terms
  searchTerm: Joi.string().min(2).max(50),
  searchFields: Joi.array()
    .items(
      Joi.string().valid(
        "firstName",
        "lastName",
        "companyName",
        "email",
        "tin",
        "phone"
      )
    )
    .default(["firstName", "lastName", "companyName", "email", "tin"]),

  // Advanced filters
  minComplianceScore: Joi.number().min(0).max(100),
  maxComplianceScore: Joi.number()
    .min(0)
    .max(100)
    .greater(Joi.ref("minComplianceScore")),
  hasOutstandingAmount: Joi.boolean(),
  lastActiveWithin: Joi.number().integer().min(1), // days
});

// Audit log schema
export const auditLogSchema = Joi.object({
  action: Joi.string()
    .valid(
      "USER_CREATED",
      "USER_UPDATED",
      "USER_DELETED",
      "ROLE_ASSIGNED",
      "ROLE_REVOKED",
      "ROLE_UPDATED",
      "LOGIN_ATTEMPT",
      "LOGIN_SUCCESS",
      "LOGIN_FAILED",
      "PASSWORD_CHANGED",
      "PASSWORD_RESET",
      "PERMISSION_GRANTED",
      "PERMISSION_REVOKED",
      "BULK_OPERATION",
      "DATA_EXPORT",
      "COMPLIANCE_CHECK"
    )
    .required(),
  targetUserId: Joi.string().required(),
  performedBy: Joi.string().required(),
  details: Joi.object().optional(),
  ipAddress: Joi.string().ip().optional(),
  userAgent: Joi.string().optional(),
  timestamp: Joi.date().default(() => new Date()),
});
