import { ComplianceStatus, VerificationStatus } from "../models/User";
import Joi from "joi";

// Update user schema
export const userUpdateSchema = Joi.object({
  phone: Joi.string().allow('').optional(),
  currentPassword: Joi.string().optional(),
  confirmPassword: Joi.string().optional(),
  newPassword: Joi.string().optional(),
  address: Joi.string().allow('').optional(),
  secondaryPhone: Joi.string().allow('').optional(),
  occupation: Joi.string().allow('').optional(),
  email: Joi.string().allow('').optional(), // Special handling for email
  companyEmail: Joi.string().allow('').optional(), // Special handling for email
  employerName: Joi.string().allow('').optional(),
  profileImage: Joi.string().allow('').optional(),
  payeRole: Joi.string().allow('').optional(),
  agentRole: Joi.string().allow('').optional(),
  groupsRole: Joi.string().allow('').optional(),
  mdaRole: Joi.string().allow('').optional(),
  userType: Joi.string().allow('').optional(),
  position: Joi.string().allow('').optional(),
  state: Joi.string().allow('').optional(),
  falseIdentificationFlag: Joi.boolean().optional(),
  complianceScore: Joi.number().optional(),
  employerTin: Joi.string().allow('').optional(),
  outstandAmount: Joi.number().optional(),
  penalties: Joi.number().optional(),
  complianceStatus: Joi.string().valid(...Object.values(ComplianceStatus)).allow('').optional(),
  verificationStatus: Joi.string().valid(...Object.values(VerificationStatus)).allow('').optional(),
});

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns Error message if invalid, null if valid
 */
export const validatePasswordStrength = (password: string): string | null => {
  if (password.length < 8) return "Password must be at least 8 characters long";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return null;
};