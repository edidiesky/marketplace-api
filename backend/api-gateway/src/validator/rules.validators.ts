import Joi from "joi";
import { RulesIDType } from "../models/Rules";

const limitsSchema = Joi.object({
  algorithm: Joi.string()
    .valid("token-bucket", "sliding-window-log")
    .required()
    .messages({
      "any.only": "limits.algorithm must be token-bucket or sliding-window-log",
      "any.required": "limits.algorithm is required",
    }),
  max_req: Joi.number().integer().min(1).required().messages({
    "number.min": "limits.max_req must be at least 1",
    "any.required": "limits.max_req is required",
  }),
  windowMs: Joi.number().integer().min(1000).required().messages({
    "number.min": "limits.windowMs must be at least 1000ms",
    "any.required": "limits.windowMs is required",
  }),
  refillRate: Joi.number().min(0.001).optional(),
  burstMultiplier: Joi.number().min(1).optional(),
});

export const createRuleSchema = Joi.object({
  id_type: Joi.string()
    .valid(...Object.values(RulesIDType))
    .required()
    .messages({
      "any.only": `id_type must be one of: ${Object.values(RulesIDType).join(", ")}`,
      "any.required": "id_type is required",
    }),
  id_value: Joi.string().trim().min(1).required().messages({
    "any.required": "id_value is required",
    "string.empty": "id_value cannot be empty",
  }),
  resource: Joi.string().trim().min(1).required().messages({
    "any.required": "resource is required",
    "string.empty": "resource cannot be empty",
  }),
  limits: limitsSchema.required().messages({
    "any.required": "limits is required",
  }),
  enabled: Joi.boolean().default(true),
});

export const updateRuleSchema = Joi.object({
  limits: limitsSchema.optional(),
  enabled: Joi.boolean().optional(),
  resource: Joi.string().trim().min(1).optional(),
})
  .min(1) // at least one field required
  .messages({
    "object.min": "At least one of limits, enabled, or resource must be provided",
  });

export const toggleRuleSchema = Joi.object({
  enabled: Joi.boolean().required().messages({
    "any.required": "enabled is required",
    "boolean.base": "enabled must be a boolean",
  }),
});

export const getRulesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  id_type: Joi.string()
    .valid(...Object.values(RulesIDType))
    .optional(),
  resource: Joi.string().optional(),
  enabled: Joi.boolean().optional(),
});