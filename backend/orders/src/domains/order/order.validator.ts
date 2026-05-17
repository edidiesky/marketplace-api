import Joi from "joi";
import { FulfillmentStatus } from "./order.model";

export const checkoutSchema = Joi.object({
  cartId:    Joi.string().required(),
  requestId: Joi.string().uuid().required(),
});

export const shippingSchema = Joi.object({
  fullName:   Joi.string().required(),
  address:    Joi.string().required(),
  city:       Joi.string().required(),
  state:      Joi.string().required(),
  country:    Joi.string().required(),
  phone:      Joi.string().required(),
  postalCode: Joi.string().optional(),
});

export const fulfillmentSchema = Joi.object({
  status: Joi.string()
    .valid(
      FulfillmentStatus.PREPARING,
      FulfillmentStatus.DISPATCHED,
      FulfillmentStatus.IN_TRANSIT,
      FulfillmentStatus.OUT_FOR_DELIVERY,
      FulfillmentStatus.DELIVERED,
      FulfillmentStatus.DELIVERY_FAILED,
      FulfillmentStatus.RETURNED
    )
    .required(),
  trackingNumber: Joi.string().optional(),
  courierName:    Joi.string().optional(),
});

export const abandonOrderSchema = Joi.object({
  reason: Joi.string().optional(),
});