import Joi from "joi";

export const createReviewSchema = Joi.object({
  productId: Joi.string().length(24).hex().required(),
  orderId: Joi.string().length(24).hex().required(),
  rating: Joi.number().min(1).max(5).required(),
  title: Joi.string().min(10).max(150).required(),
  comment: Joi.string().min(20).max(2000).required(),
  images: Joi.array().items(Joi.string().uri()).max(5).optional(),
}).options({ stripUnknown: true });

export const respondToReviewSchema = Joi.object({
  text: Joi.string().min(10).max(1000).required(),
});
