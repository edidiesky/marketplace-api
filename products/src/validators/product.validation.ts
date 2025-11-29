import Joi from "joi";
export const productSchema = Joi.object({
  name: Joi.string().min(4).max(30).required(),
  price: Joi.number().required(),
  availableStock: Joi.number().integer().min(0).required()
    .messages({ "any.required": "You must specify how many items are in stock" }),
  thresholdStock: Joi.number().integer().min(1).optional().default(10),
  trackInventory: Joi.boolean().default(true),
  description: Joi.string().min(4).max(500),
  images: Joi.array().items(Joi.string().required().min(1)),
  isArchive: Joi.boolean().optional(),
  colors: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": `"Colors" must have at least one color`,
    }),
  size: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": `"Size" must have at least one color`,
    }),
  category: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": `"category" must have at least one value`,
  }),
});
