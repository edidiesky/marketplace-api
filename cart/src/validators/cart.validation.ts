import Joi from "joi";

export const addToCartSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  productTitle: Joi.string().length(24).required(),
  productPrice: Joi.number().required(),
  productImage: Joi.string().required(),
  quantity: Joi.number().integer().min(1).max(100).default(1).required(),
}).options({ stripUnknown: true });



export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(0).max(100).required().messages({
    "number.min": "Quantity cannot be negative. Use remove endpoint to delete.",
  }),
});

export const removeFromCartSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
});
