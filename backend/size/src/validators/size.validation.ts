import Joi from "joi";
export const sizeSchema = Joi.object({
  name: Joi.string().min(4).max(20).required(),
  value: Joi.number().required(),
});
