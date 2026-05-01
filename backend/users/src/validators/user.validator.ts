import Joi from "joi";
import { UserType, TenantStatus, BillingPlan, Gender } from "../models/User";

export const userUpdateSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).optional(),
  lastName: Joi.string().trim().min(1).max(100).optional(),
  phone: Joi.string()
    .pattern(/^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "Phone must be a valid number with an optional country code (e.g. +2348100099551)",
    }),
  address: Joi.string().trim().max(300).optional(),
  profileImage: Joi.string().uri().optional(),
  gender: Joi.string().valid(...Object.values(Gender)).optional(),
  nationality: Joi.string().trim().max(100).optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
});


export const userListQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      "number.base": "page must be an integer",
      "number.min": "page must be at least 1",
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      "number.base": "limit must be an integer",
      "number.min": "limit must be at least 1",
      "number.max": "limit cannot exceed 100",
    }),

  userType: Joi.string()
    .valid(...Object.values(UserType))
    .optional()
    .messages({
      "any.only": `userType must be one of: ${Object.values(UserType).join(", ")}`,
    }),

  tenantStatus: Joi.string()
    .valid(...Object.values(TenantStatus))
    .optional()
    .messages({
      "any.only": `tenantStatus must be one of: ${Object.values(TenantStatus).join(", ")}`,
    }),

  tenantPlan: Joi.string()
    .valid(...Object.values(BillingPlan))
    .optional()
    .messages({
      "any.only": `tenantPlan must be one of: ${Object.values(BillingPlan).join(", ")}`,
    }),

  gender: Joi.string()
    .valid(...Object.values(Gender))
    .optional()
    .messages({
      "any.only": `gender must be one of: ${Object.values(Gender).join(", ")}`,
    }),

  isEmailVerified: Joi.boolean()
    .truthy("true", "1")
    .falsy("false", "0")
    .optional()
    .messages({
      "boolean.base": "isEmailVerified must be true or false",
    }),

  isArchived: Joi.boolean()
    .truthy("true", "1")
    .falsy("false", "0")
    .optional()
    .messages({
      "boolean.base": "isArchived must be true or false",
    }),

  falseIdentificationFlag: Joi.boolean()
    .truthy("true", "1")
    .falsy("false", "0")
    .optional()
    .messages({
      "boolean.base": "falseIdentificationFlag must be true or false",
    }),

  firstName: Joi.string().trim().min(1).max(100).optional().messages({
    "string.min": "firstName filter must be at least 1 character",
    "string.max": "firstName filter cannot exceed 100 characters",
  }),

  lastName: Joi.string().trim().min(1).max(100).optional().messages({
    "string.min": "lastName filter must be at least 1 character",
    "string.max": "lastName filter cannot exceed 100 characters",
  }),

  email: Joi.string().email().optional().messages({
    "string.email": "email must be a valid email address",
  }),
}).options({ stripUnknown: true });