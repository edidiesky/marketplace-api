import Joi from "joi";
import { ReviewStatus } from "./review.model";

export const createReviewSchema = Joi.object({
  productId:          Joi.string().required(),
  storeId:            Joi.string().required(),
  orderId:            Joi.string().required(),
  rating:             Joi.number().valid(1, 2, 3, 4, 5).required(),
  title:              Joi.string().min(10).max(150).required(),
  comment:            Joi.string().min(20).max(2_000).required(),
  images:             Joi.array().items(Joi.string().uri()).max(5).optional(),
  isVerifiedPurchase: Joi.boolean().required(),
  productTitle:       Joi.string().required(),
  productImage:       Joi.string().uri().optional(),
  storeName:          Joi.string().required(),
  storeLogo:          Joi.string().uri().optional(),
  reviewerName:       Joi.string().required(),
  reviewerImage:      Joi.string().uri().optional(),
});

export const respondToReviewSchema = Joi.object({
  text: Joi.string().min(1).max(1_000).required(),
});

export const markHelpfulSchema = Joi.object({
  helpful: Joi.boolean().required(),
});

export const reviewQuerySchema = Joi.object({
  rating:   Joi.number().valid(1, 2, 3, 4, 5).optional(),
  verified: Joi.boolean().optional(),
  page:     Joi.number().integer().min(1).default(1),
  limit:    Joi.number().integer().min(1).max(100).default(10),
});

export const storeReviewQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(ReviewStatus))
    .optional(),
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});