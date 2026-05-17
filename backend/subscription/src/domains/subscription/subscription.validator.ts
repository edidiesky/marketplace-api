import Joi from "joi";
import { BillingPlan } from "./subscription.model";

export const upgradeSubscriptionSchema = Joi.object({
  plan: Joi.string()
    .valid(BillingPlan.PRO, BillingPlan.ENTERPRISE)
    .required()
    .messages({
      "any.only": "Plan must be PRO or ENTERPRISE",
      "any.required": "Plan is required",
    }),
});

export const checkFeatureSchema = Joi.object({
  organizationId: Joi.string().required(),
  feature: Joi.string()
    .valid(
      "maxStores",
      "maxProducts",
      "maxOrders",
      "customDomain",
      "analytics",
      "prioritySupport",
      "commissionRate"
    )
    .required(),
});