import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

export const cartReminderSchema = Joi.object({
  orderId: objectId.required().messages({
    "string.pattern.base": "Invalid orderId format.",
    "any.required":        "orderId is required.",
  }),
  userId: objectId.required().messages({
    "string.pattern.base": "Invalid userId format.",
    "any.required":        "userId is required.",
  }),
});

export const lowStockAlertSchema = Joi.object({
  inventoryId: objectId.required().messages({
    "string.pattern.base": "Invalid inventoryId format.",
    "any.required":        "inventoryId is required.",
  }),
  storeId: objectId.required().messages({
    "string.pattern.base": "Invalid storeId format.",
    "any.required":        "storeId is required.",
  }),
  quantityAvailable: Joi.number().min(0).required(),
  reorderPoint:      Joi.number().min(0).required(),
  productName:       Joi.string().required(),
  email:             Joi.string().email().required(),
  sellerName:        Joi.string().required(),
});