import { FulfillmentStatus } from "../models/Order";
import Joi from "joi";
export const CheckoutSchema = Joi.object({
  cartId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid cartId format",
      "any.required": "cartId is required",
    }),
  requestId: Joi.string()
    .min(1)
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .required()
    .messages({
      "any.required": "requestId is required",
      "string.pattern.base": "requestId must be alphanumeric with hyphens or underscores",
    }),
});

export const ShippingSchema = Joi.object({
  fullName: Joi.string().min(2).required(),
  address: Joi.string().min(3).required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  country: Joi.string().required(),
  phone: Joi.string().required(),
  postalCode: Joi.string().optional(),
});

export const FulfillmentSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(FulfillmentStatus))
    .required()
    .messages({
      "any.only": `status must be one of: ${Object.values(FulfillmentStatus).join(", ")}`,
      "any.required": "status is required",
    }),
  trackingNumber: Joi.string().optional(),
  courierName: Joi.string().optional(),
});


export const abandonOrderSchema = Joi.object({
  reason: Joi.string().optional(),
});