import Joi from "joi";
import { UserType, Gender } from "./auth.model";

export const initiateOnboardingSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required(),
  password: Joi.string()
    .min(8)
    .max(64)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{}|;':",.<>?/\\`~])/
    )
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number and special character.",
    }),
  notificationId: Joi.string().uuid().optional(),
});

export const confirmEmailTokenSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required(),
  token: Joi.string().uuid().required(),
});

export const finalSignupOnboardingSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required(),
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName:  Joi.string().trim().min(1).max(100).required(),
  userType:  Joi.string()
    .valid(...Object.values(UserType))
    .required(),
  phone: Joi.string()
    .pattern(/^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone must be a valid number with or without country code.",
    }),
  address: Joi.string().trim().max(300).optional(),
  gender:  Joi.string()
    .valid(...Object.values(Gender))
    .optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required(),
  password:       Joi.string().required(),
  idempotencyKey: Joi.string().uuid().optional(),
});

export const twoFASchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required(),
  otp: Joi.string().min(4).max(8).required(),
});

export const requestPasswordResetSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required(),
});

export const passwordResetSchema = Joi.object({
  token:       Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(64)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{}|;':",.<>?/\\`~])/
    )
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number and special character.",
    }),
});

export const changePasswordSchema = Joi.object({
  email:       Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required(),
  newPassword: Joi.string()
    .min(8)
    .max(64)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{}|;':",.<>?/\\`~])/
    )
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number and special character.",
    }),
});