import Joi from "joi";

export const addToCartSchema = Joi.object({
  productId:          Joi.string().required(),
  productTitle:       Joi.string().required(),
  productImage:       Joi.array().items(Joi.string()).required(),
  productPrice:       Joi.number().min(0).required(),
  productDescription: Joi.string().optional(),
  quantity:           Joi.number().min(1).default(1),
  sellerId:           Joi.string().required(),
  email:              Joi.string().email().optional(),
  idempotencyKey:     Joi.string().optional(),
});

export const updateCartItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity:  Joi.number().min(1).required(),
});

export const deleteCartItemSchema = Joi.object({
  productId: Joi.string().required(),
});