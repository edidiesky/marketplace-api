import Joi from "joi";

export const requestPayoutSchema = Joi.object({
  storeId: Joi.string().required(),
  amount:  Joi.number().min(1).required(),
  bankDetails: Joi.object({
    accountNumber: Joi.string().required(),
    bankCode:      Joi.string().required(),
    accountName:   Joi.string().required(),
  }).required(),
});

export const rejectPayoutSchema = Joi.object({
  reason: Joi.string().required(),
});