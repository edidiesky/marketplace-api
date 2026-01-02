import Joi from "joi";
import { PaymentGateway, PaymentStatus } from "../models/Payment";

export const initializePaymentSchema = Joi.object({
  orderId: Joi.string().required().messages({
    "any.required": "Order ID is required",
    "string.empty": "Order ID cannot be empty",
  }),
  gateway: Joi.string()
    .valid(...Object.values(PaymentGateway))
    .required()
    .messages({
      "any.only": `Gateway must be one of: ${Object.values(PaymentGateway).join(
        ", "
      )}`,
      "any.required": "Payment gateway is required",
    }),
  customerEmail: Joi.string().email().required(),
  customerName: Joi.string().required(),
  amount: Joi.number().positive().required(),
  phone: Joi.string().optional().allow(""),
  currency: Joi.string().uppercase().default("NGN"),
  metadata: Joi.object().optional(),
});

export const webhookSchema = Joi.object({}).unknown(true);

export const refundSchema = Joi.object({
  paymentId: Joi.string().required(),
  amount: Joi.number().positive().optional(),
  reason: Joi.string().optional().default("Customer requested refund"),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
        .valid(...Object.values(PaymentStatus))
    .optional(),
  gateway: Joi.string()
    .valid(...Object.values(PaymentGateway))
    .optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  orderId: Joi.string().optional(),
});
