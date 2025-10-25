import Joi from "joi";
import { UserType, DirectorateType, ProofOfResidency } from "../models/User";

// Agency signup schema
export const agencySignupSchema = Joi.object({
  userType: Joi.string()
    .required()
    .messages({
      "any.required": "User type is required",
    }),

  // Agency-specific fields (required for all agency types)
  agencyName: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      "any.required": "Agency name is required",
      "string.min": "Agency name must be at least 3 characters",
      "string.max": "Agency name must not exceed 200 characters",
    }),

  // Common contact fields
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .lowercase()
    .trim()
    .messages({
      "string.email": "Must be a valid email address",
      "any.required": "Email is required",
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone must be a valid number with an optional country code (e.g., +2348100099551)",
      "any.required": "Phone is required",
    }),

  secondaryPhone: Joi.string()
    .trim()
    .pattern(/^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/)
    .optional()
    .messages({
      "string.pattern.base": "Secondary phone must be a valid number with an optional country code",
    }),

  address: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      "any.required": "Address is required",
      "string.min": "Address must be at least 10 characters",
      "string.max": "Address must not exceed 500 characters",
    }),

  // Operational fields (required for agencies)
  lgaOfOperation: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "LGA of operation is required",
    }),

  operationalZone: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Operational zone is required",
    }),

  // Federal-specific fields (conditional)
  isSubOffice: Joi.boolean()
    .when(Joi.ref("userType"), {
      is: UserType.FEDERAL,
      then: Joi.required().messages({
        "any.required": "Please specify if this is a sub-office for federal agencies",
      }),
      otherwise: Joi.optional(),
    }),

  subOfficeAddress: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .when(Joi.ref("userType"), {
      is: UserType.FEDERAL,
      then: Joi.when(Joi.ref("isSubOffice"), {
        is: true,
        then: Joi.required().messages({
          "any.required": "Sub-office address is required when isSubOffice is true",
        }),
        otherwise: Joi.optional(),
      }),
      otherwise: Joi.forbidden(),
    }),

  // Optional fields
  proofOfResidency: Joi.string()
    .valid(...Object.values(ProofOfResidency))
    .optional()
    .messages({
      "any.only": `Proof of residency must be one of ${Object.values(ProofOfResidency).join(", ")}`,
    }),
  // Role and directorate
  directorate: Joi.string()
    .valid(DirectorateType.MDA)
    .default(DirectorateType.MDA)
    .optional()
    .messages({
      "any.only": `Directorate must be ${DirectorateType.MDA} for agencies`,
    }),

  roleCode: Joi.string()
    .required()
    .messages({
      "any.required": "Role code is required",
    }),
}).options({
  abortEarly: false,
  stripUnknown: true,
});

// Export for use in controller