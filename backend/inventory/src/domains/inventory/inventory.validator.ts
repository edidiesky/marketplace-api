import Joi from "joi";

export const createInventorySchema = Joi.object({
  productId:       Joi.string().required(),
  quantityOnHand:  Joi.number().min(0).required(),
  reorderPoint:    Joi.number().min(0).optional(),
  reorderQuantity: Joi.number().min(0).optional(),
  productTitle:    Joi.string().optional(),
  productImage:    Joi.string().optional(),
  storeName:       Joi.string().optional(),
  storeDomain:     Joi.string().optional(),
  ownerName:       Joi.string().optional(),
  ownerEmail:      Joi.string().email().optional(),
  warehouseName:   Joi.string().optional(),
});

export const updateInventorySchema = Joi.object({
  quantityOnHand:  Joi.number().min(0).optional(),
  reorderPoint:    Joi.number().min(0).optional(),
  reorderQuantity: Joi.number().min(0).optional(),
  warehouseName:   Joi.string().optional(),
});

export const reserveStockSchema = Joi.object({
  productId: Joi.string().required(),
  storeId:   Joi.string().required(),
  quantity:  Joi.number().min(1).required(),
  sagaId:    Joi.string().required(),
  userId:    Joi.string().required(),
});

export const releaseStockSchema = Joi.object({
  productId: Joi.string().required(),
  storeId:   Joi.string().required(),
  quantity:  Joi.number().min(1).required(),
  sagaId:    Joi.string().required(),
  userId:    Joi.string().required(),
});

export const commitStockSchema = Joi.object({
  productId: Joi.string().required(),
  storeId:   Joi.string().required(),
  quantity:  Joi.number().min(1).required(),
  sagaId:    Joi.string().required(),
  userId:    Joi.string().required(),
});

export const expireReservationSchema = Joi.object({
  inventoryId: Joi.string().required(),
  quantity:    Joi.number().min(1).required(),
});