import { ProofOfResidency } from "../models/User";
import Joi from "joi";

export const groupSignupSchema = Joi.object({
  groupName: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/)
    .required(),
  secondaryPhone: Joi.string()
    .pattern(/^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/)
    .optional(),
  address: Joi.string().required(),
  lga: Joi.string().required(),
  state: Joi.string().required(),
  natureOfBusiness: Joi.string().optional(),
  businessSector: Joi.string().optional(),
  operationalZone: Joi.string().optional(),
  proofOfResidency: Joi.string()
    .valid(...Object.values(ProofOfResidency))
    .optional(),
  uploadedFile: Joi.string().optional(),
  profileImage: Joi.string().optional(),
  roleCode: Joi.string().optional(),
  chairmanName: Joi.string().optional(),
  chairmanPhone: Joi.string().optional(),
  chairmanEmail: Joi.string().email().optional(),
}).options({ abortEarly: false, stripUnknown: true });
