import Joi from "joi";
export const createStoreSchema = Joi.object({
  ownerName: Joi.string().min(2).max(100).trim().required().messages({
    "string.min": "Owner name must be at least 2 characters",
    "string.max": "Owner name too long",
    "any.required": "Owner name is required",
  }),

  ownerEmail: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .required()
    .messages({
      "string.email": "Please provide a valid owner email",
      "any.required": "Owner email is required",
    }),

  name: Joi.string().min(3).max(100).trim().required().messages({
    "string.min": "Store name must be at least 3 characters",
    "any.required": "Store name is required",
  }),

  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(3)
    .max(50)
    .lowercase()
    .trim()
    .required()
    .messages({
      "string.pattern.base":
        "Slug can only contain lowercase letters, numbers, and hyphens",
      "any.required": "Slug is required",
    }),

  subdomain: Joi.string()
    .pattern(/^[a-z0-9]+$/)
    .min(4)
    .max(20)
    .lowercase()
    .trim()
    .required()
    .messages({
      "string.pattern.base":
        "Subdomain can only contain lowercase letters and numbers (no hyphens)",
      "any.required": "Subdomain is required",
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .required()
    .messages({
      "string.email": "Store contact email must be valid",
      "any.required": "Store email is required",
    }),

  phoneNumber: Joi.string()
    .pattern(/^(\+?[0-9\s\-\(\)]{8,20})$/)
    .optional()
    .allow("")
    .messages({
      "string.pattern.base": "Invalid phone number format",
    }),

  description: Joi.string().max(1000).optional().allow(""),

  logo: Joi.string().uri().optional().allow(""),
  banner: Joi.string().uri().optional().allow(""),

  address: Joi.object({
    street: Joi.string().min(5).max(200).required(),
    city: Joi.string().min(2).max(100).required(),
    state: Joi.string().min(2).max(100).required(),
    country: Joi.string().min(2).max(100).required(),
    postalCode: Joi.string().min(3).max(20).required(),
  })
    .required()
    .messages({
      "any.required": "Full address is required",
    }),
  notificationId: Joi.string()
    .uuid({ version: ["uuidv4"] })
    .required()
    .messages({
      "string.guid": "notificationId must be a valid UUID v4",
      "any.required": "notificationId is required",
    }),

  settings: Joi.object({
    currency: Joi.string()
      .default("USD")
      .valid("USD", "NGN", "EUR", "GBP", "CAD"),
    timezone: Joi.string().default("UTC"),
    taxRate: Joi.number().min(0).max(100).default(0),
    paymentMethods: Joi.array()
      .items(Joi.string().valid("card", "bank_transfer", "paypal", "crypto"))
      .default(["card"]),
    shippingMethods: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          rate: Joi.number().min(0).precision(2).required(),
          estimatedDays: Joi.number().min(1).max(30).integer().required(),
        })
      )
      .default([]),
  }).default(),
})
  .options({ stripUnknown: true })
  .unknown(false);
