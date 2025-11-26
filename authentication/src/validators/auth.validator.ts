import { UserType } from "../models/User";
import Joi from "joi";

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(5).required(),
});

export const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(5).required(),
});

export const requestPasswordResetSchema = Joi.object({
  email: Joi.string().min(5).required(),
});

export const signupSchema = Joi.object({
  userType: Joi.string()
    .valid(
      ...Object.values(UserType).filter((type) =>
        [UserType.SELLERS, UserType.INVESTORS].includes(type)
      )
    )
    .required()
    .messages({
      "any.only": `User type must be one of ${[
        UserType.SELLERS,
        UserType.INVESTORS,
      ].join(", ")}`,
      "any.required": "User type is required",
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
  fullName: Joi.string().optional(),
  phone: Joi.string()
    .trim()
    .pattern(/^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone must be a valid number with an optional country code (e.g., +2348100099551)",
      "any.required": "Phone is required",
    }),
});

export const twoFASchema = Joi.object({
  otp: Joi.string().required(),
  email: Joi.string().email().required(),
});
