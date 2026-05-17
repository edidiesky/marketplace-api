import Joi from "joi";
import { UserType } from "../domains/auth/auth.model";

//  ONBOARDING 

// 1: StepAccount - email + password collected together
export const initiateOnboardingSchema = Joi.object({
  email:           Joi.string().email().required(),
  password:        Joi.string()
    .min(8)
    .pattern(/[A-Z]/, "uppercase")
    .pattern(/[0-9]/, "number")
    .required()
    .messages({
      "string.min":          "Password must be at least 8 characters",
      "string.pattern.name": "Password must contain at least one {{#name}}",
    }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
  }),
  notificationId: Joi.string().optional(),
});

// Email confirmation query params
export const confirmEmailTokenSchema = Joi.object({
  token: Joi.string().required(),
  email: Joi.string().email().required(),
});

// 2: StepDetails - register user
export const finalSignupOnboardingSchema = Joi.object({
  email:     Joi.string().email().required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName:  Joi.string().min(1).max(50).required(),
  userType:  Joi.string()
    .valid(...Object.values(UserType))
    .required(),
  phone: Joi.string()
    .pattern(/^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone must be a valid number with country code",
    }),
  address: Joi.string().optional(),
  gender:  Joi.string().valid("Male", "Female").optional(),
});

//  LOGIN 

export const loginSchema = Joi.object({
  email:          Joi.string().email().required(),
  password:       Joi.string().required(),
  idempotencyKey: Joi.string().optional(),
});

export const twoFASchema = Joi.object({
  email: Joi.string().email().required(),
  otp:   Joi.string().length(6).required(),
});

//  TOKEN 

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

//  PASSWORD 

export const requestPasswordResetSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const passwordResetSchema = Joi.object({
  token:       Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, "uppercase")
    .pattern(/[0-9]/, "number")
    .required(),
});

export const changePasswordSchema = Joi.object({
  email:       Joi.string().email().required(),
  newPassword: Joi.string().min(8).required(),
});