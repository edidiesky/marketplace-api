import Joi from "joi";
import { PaymentGateway, PaymentStatus } from "./payment.model";

export const initializePaymentSchema = Joi.object({
  orderId:       Joi.string().required(),
  gateway:       Joi.string().valid(...Object.values(PaymentGateway)).required(),
  customerEmail: Joi.string().email().required(),
  customerName:  Joi.string().required(),
  phone:         Joi.string().optional().allow(""),
  currency:      Joi.string().uppercase().default("NGN"),
});

export const refundSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  reason: Joi.string().optional().default("Customer requested refund"),
});

export const paymentHistorySchema = Joi.object({
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(20),
  status:    Joi.string().valid(...Object.values(PaymentStatus)).optional(),
  gateway:   Joi.string().valid(...Object.values(PaymentGateway)).optional(),
  startDate: Joi.date().iso().optional(),
  endDate:   Joi.date().iso().optional(),
  orderId:   Joi.string().optional(),
});