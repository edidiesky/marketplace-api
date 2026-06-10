import Joi from "joi";

export const createProductSchema = Joi.object({
  name:        Joi.string().min(2).max(200).required(),
  description: Joi.string().max(2000).optional(),
  price:       Joi.number().min(0).required(),
  images:      Joi.array().items(Joi.string().uri()).optional(),
  category:    Joi.array().items(Joi.string()).optional(),
  colors: Joi.array()
    .items(
      Joi.object({
        name:  Joi.string().required(),
        value: Joi.string().required(),
      })
    )
    .optional(),
  size: Joi.array()
    .items(
      Joi.object({
        name:  Joi.string().required(),
        value: Joi.string().required(),
      })
    )
    .optional(),
  sku:       Joi.string().optional(),
  storeName: Joi.string().optional(),
  stockQuantity: Joi.number().min(0).default(0),
});

export const updateProductSchema = Joi.object({
  name:        Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(2000).optional(),
  price:       Joi.number().min(0).optional(),
  images:      Joi.array().items(Joi.string().uri()).optional(),
  category:    Joi.array().items(Joi.string()).optional(),
  colors: Joi.array()
    .items(
      Joi.object({
        name:  Joi.string().required(),
        value: Joi.string().required(),
      })
    )
    .optional(),
  size: Joi.array()
    .items(
      Joi.object({
        name:  Joi.string().required(),
        value: Joi.string().required(),
      })
    )
    .optional(),
  isArchive: Joi.boolean().optional(),
  isDeleted: Joi.boolean().optional(),
  sku:       Joi.string().optional(),
});