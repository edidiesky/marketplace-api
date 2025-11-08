import { VerificationStatus } from "../models/User";
import Joi from "joi";

// Update user schema
export const userUpdateSchema = Joi.object({
  phone: Joi.string().allow("").optional(),
  currentPassword: Joi.string().optional(),
  confirmPassword: Joi.string().optional(),
  newPassword: Joi.string().optional(),
  email: Joi.string().allow("").optional(),
  verificationStatus: Joi.string()
    .valid(...Object.values(VerificationStatus))
    .allow("")
    .optional(),
});

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns Error message if invalid, null if valid
 */
export const validatePasswordStrength = (password: string): string | null => {
  if (password.length < 8) return "Password must be at least 8 characters long";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(password))
    return "Password must contain at least one number";
  return null;
};
