import Joi from "joi";

const CartItemSchema = Joi.object({
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid productId format (must be 24-char hex)",
      "any.required": "productId is required",
    }),

  productTitle: Joi.string()
    .min(1)
    .required()
    .messages({
      "string.min": "Product title is required",
      "any.required": "productTitle is required",
    }),

  productDescription: Joi.string().optional(),

  productPrice: Joi.number()
    .positive()
    .required()
    .messages({
      "number.positive": "Product price must be positive",
      "any.required": "productPrice is required",
    }),

  productQuantity: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      "number.min": "Quantity must be at least 1",
      "any.required": "productQuantity is required",
    }),

  productImage: Joi.array()
    .items(Joi.string().uri())
    .min(1)
    .required()
    .messages({
      "array.min": "At least one product image URL is required",
      "any.required": "productImage is required",
    }),
});

export const CreateOrderSchema = Joi.object({
  requestId: Joi.string()
    .min(1)
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .required()
    .messages({
      "string.min": "requestId is required",
      "string.pattern.base": "requestId must contain only alphanumeric characters, hyphens, or underscores",
      "any.required": "requestId is required",
    }),
  sellerId:Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid sellerId format",
        "any.required": "sellerId is required",
      }),
  cart: Joi.object({
    _id: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid cartId format",
        "any.required": "cart._id is required",
      }),

    storeId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid storeId format",
        "any.required": "cart.storeId is required",
      }),

    fullName: Joi.string()
      .min(2)
      .required()
      .messages({
        "string.min": "Full name must be at least 2 characters",
        "any.required": "fullName is required",
      }),

    totalPrice: Joi.number()
      .positive()
      .required()
      .messages({
        "number.positive": "Total price must be positive",
        "any.required": "totalPrice is required",
      }),

    quantity: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        "number.min": "Total quantity must be at least 1",
        "any.required": "quantity is required",
      }),

    cartItems: Joi.array()
      .items(CartItemSchema)
      .min(1)
      .required()
      .messages({
        "array.min": "Cart must contain at least one item",
        "any.required": "cartItems is required",
      }),
  }).required(),
});