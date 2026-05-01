import Joi from "joi";
export const categorySchema = Joi.object({
  name: Joi.string().min(4).max(30).required(),
  price: Joi.number().required(),
  availableStock: Joi.number().min(1).required(),
});
