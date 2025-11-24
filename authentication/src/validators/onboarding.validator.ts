import Joi from "joi";
import { BillingPlan, Gender, TenantType, UserType } from "../models/User";

/**
 * POST /api/v1/auth/email/confirmation
 */
export const emailOnboardingSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .lowercase()
    .trim()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),

  firstName: Joi.string().trim().min(2).max(50).required().messages({
    "string.min": "First name must be at least 2 characters",
    "any.required": "First name is required",
  }),

  lastName: Joi.string().trim().min(2).max(50).required().messages({
    "string.min": "Last name must be at least 2 characters",
    "any.required": "Last name is required",
  }),

  notificationId: Joi.string()
    .uuid({ version: ["uuidv4"] })
    .required()
    .messages({
      "string.guid": "notificationId must be a valid UUID v4",
      "any.required": "notificationId is required",
    }),
});

/**
 * GET /api/v1/auth/email/confirmation?email=...&token=...
 */
export const confirmEmailTokenSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .lowercase()
    .trim(),

  token: Joi.string()
    .uuid({ version: ["uuidv4"] })
    .required()
    .messages({
      "string.guid": "Token must be a valid UUID v4",
      "any.required": "Token is required",
    }),
}).required();

/**
 * POST /api/v1/auth/password/confirmation
 */
export const passwordOnboardingSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .lowercase()
    .trim(),

  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase, one lowercase, one number and one special character",
      "any.required": "Password is required",
    }),
});

/**
 * POST /api/v1/auth/signup (final step)
 */
export const finalSignupOnboardingSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .lowercase()
    .trim(),

  userType: Joi.string()
    .valid(UserType.SELLERS, UserType.INVESTORS)
    .required()
    .messages({
      "any.only":
        "Pleasse kindly provide the right userType. User type must be SELLERS or INVESTORS",
      "any.required": "userType is required",
    }),

  phone: Joi.string()
    .pattern(/^(\+?[1-9]\d{0,3})?[1-9]\d{8,14}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Please enter a valid phone number with country code (e.g. +2348012345678)",
      "any.required": "Phone number is required",
    }),

  address: Joi.string().trim().min(5).max(200).required().messages({
    "any.required": "Address is required",
  }),
  gender: Joi.string()
    .valid(...Object.values(Gender))
    .required(),
  plan: Joi.string()
    .valid(...Object.values(BillingPlan))
    .messages({
      "any.only":
        "Pleasse kindly provide the right billing plan. Plan must be FREE or PRO",
      "any.required": "billing plan is required",
    }),

  tenantType: Joi.string().valid(...Object.values(TenantType)),
});
