import Joi from "joi";

export const cartReminderSchema = Joi.object({
  orderId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid orderId format",
      "any.required": "orderId is required",
    }),
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid userId format",
      "any.required": "userId is required",
    }),
});

export const lowStockAlertSchema = Joi.object({
  inventoryId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid inventoryId format",
      "any.required": "inventoryId is required",
    }),
  storeId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid storeId format",
      "any.required": "storeId is required",
    }),
  quantityAvailable: Joi.number().min(0).required().messages({
    "any.required": "quantityAvailable is required",
  }),
  reorderPoint: Joi.number().min(0).required().messages({
    "any.required": "reorderPoint is required",
  }),
});