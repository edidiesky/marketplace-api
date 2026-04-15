import Joi from "joi";
export const inventorySchema = Joi.object({
  productId: Joi.string().required(),
  ownerId: Joi.string().required(),
  quantityOnHand: Joi.number().min(0).required(),
  reorderPoint: Joi.number().min(0).optional(),
  reorderQuantity: Joi.number().min(0).optional(),
  productTitle: Joi.string().optional(),
  storeName: Joi.string().optional(),
  storeDomain: Joi.string().optional(),
  ownerName: Joi.string().optional(),
  ownerEmail: Joi.string().email().optional(),
  warehouseName: Joi.string().optional(),
});