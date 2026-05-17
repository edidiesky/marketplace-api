import Joi from "joi";
import { StoreStatus } from "./store.model";

const addressSchema = Joi.object({
  street:     Joi.string().required(),
  city:       Joi.string().required(),
  state:      Joi.string().required(),
  country:    Joi.string().required(),
  postalCode: Joi.string().required(),
});

const settingsSchema = Joi.object({
  currency:        Joi.string().length(3).uppercase().optional(),
  timezone:        Joi.string().optional(),
  taxRate:         Joi.number().min(0).max(100).optional(),
  shippingMethods: Joi.array().items(
    Joi.object({
      name:          Joi.string().required(),
      rate:          Joi.number().required(),
      estimatedDays: Joi.number().required(),
    })
  ).optional(),
  paymentMethods: Joi.array().items(Joi.string()).optional(),
});

export const createStoreSchema = Joi.object({
  name:           Joi.string().min(2).max(100).required(),
  subdomain:      Joi.string()
    .min(3)
    .max(63)
    .lowercase()
    .pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
    .optional()
    .messages({
      "string.pattern.base":
        "Subdomain must contain only lowercase letters, numbers, and hyphens",
    }),
  description:    Joi.string().max(1000).optional(),
  logo:           Joi.string().uri().optional(),
  email:          Joi.string().email().required(),
  phoneNumber:    Joi.string().optional(),
  address:        addressSchema.required(),
  settings:       settingsSchema.optional(),
  notificationId: Joi.string().optional(),
});

export const updateStoreSchema = Joi.object({
  name:        Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  logo:        Joi.string().uri().optional(),
  banner:      Joi.string().uri().optional(),
  email:       Joi.string().email().optional(),
  phoneNumber: Joi.string().optional(),
  address:     Joi.object({
    street:     Joi.string().optional(),
    city:       Joi.string().optional(),
    state:      Joi.string().optional(),
    country:    Joi.string().optional(),
    postalCode: Joi.string().optional(),
  }).optional(),
  settings: settingsSchema.optional(),
});

export const updateStoreStatusSchema = Joi.object({
  status: Joi.string()
    .valid(StoreStatus.ACTIVE, StoreStatus.SUSPENDED, StoreStatus.CLOSED)
    .required(),
  reason: Joi.string().max(255).optional(),
});

export const addCustomDomainSchema = Joi.object({
  customDomain: Joi.string()
    .hostname()
    .required()
    .messages({
      "string.hostname": "customDomain must be a valid domain name",
    }),
});