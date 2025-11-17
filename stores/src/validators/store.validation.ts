
import Joi from "joi";

export const createStoreSchema = Joi.object({
  ownerName: Joi.string().min(2).required().messages({
    "string.min": "Owner name must be at least 2 characters",
    "any.required": "Owner name is required",
  }),

  ownerEmail: Joi.string().email().required().messages({
    "string.email": "Please provide a valid owner email",
    "any.required": "Owner email is required",
  }),

  name: Joi.string().min(3).max(100).required().messages({
    "string.min": "Store name must be at least 3 characters",
    "any.required": "Store name is required",
  }),

  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens only")
    .min(3)
    .max(50)
    .required()
    .messages({
      "string.pattern.base": "Slug can only contain lowercase letters, numbers, and hyphens",
      "any.required": "Slug is required",
    }),

  subdomain: Joi.string()
    .pattern(/^[a-z0-9]+$/, "letters and numbers only")
    .min(4)
    .max(20)
    .required()
    .messages({
      "string.pattern.base": "Subdomain can only contain lowercase letters and numbers",
      "any.required": "Subdomain is required",
    }),

  email: Joi.string().email().required().messages({
    "string.email": "Store contact email must be valid",
    "any.required": "Store email is required",
  }),

  phoneNumber: Joi.string().pattern(/^\+?[0-9]{8,15}$/).optional().allow("").messages({
    "string.pattern.base": "Please provide a valid phone number",
  }),

  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    postalCode: Joi.string().required(),
  })
    .required()
    .messages({
      "any.required": "Address is required",
    }),

  settings: Joi.object({
    currency: Joi.string().default("USD"),
    timezone: Joi.string().default("UTC"),
    taxRate: Joi.number().min(0).max(100).default(0),
    paymentMethods: Joi.array().items(Joi.string()).default(["card", "bank_transfer"]),
    shippingMethods: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          rate: Joi.number().min(0).required(),
          estimatedDays: Joi.number().min(1).required(),
        })
      )
      .default([]),
  }).default(),
}).options({ stripUnknown: true });
