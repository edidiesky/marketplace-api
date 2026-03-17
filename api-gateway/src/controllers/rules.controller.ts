import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import { IRules } from "../models/Rules";
import { RulesService, CreateRuleDTO, UpdateRuleDTO } from "../services/rules.service";
import logger from "../utils/logger";

const SUCCESS_STATUS = 200;
const CREATED_STATUS = 201;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const SERVER_ERROR_STATUS = 500;

export class RulesController {
  constructor(private readonly service: RulesService) {}

  createRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const rule = await this.service.createRule(req.body as CreateRuleDTO);
      logger.info("Rule created via API", { ruleId: rule._id });
      res.status(CREATED_STATUS).json({ status: "success", data: rule });
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        res.status(CONFLICT_STATUS).json({
          status: "error",
          errors: [{ message: error.message }],
        });
        return;
      }
      logger.error("Failed to create rule", { error: error.message });
      res.status(SERVER_ERROR_STATUS).json({
        status: "error",
        errors: [{ message: "Failed to create rule" }],
      });
    }
  };

  getRules = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, id_type, resource, enabled } = req.query as any;

      const filter: FilterQuery<IRules> = {};
      if (id_type) filter.id_type = id_type;
      if (resource) filter.resource = resource;
      if (enabled !== undefined) filter.enabled = enabled;

      const result = await this.service.getRules(filter, page, limit);
      res.status(SUCCESS_STATUS).json({
        status: "success",
        data: result.data,
        pagination: { page: result.page, limit: result.limit, total: result.total },
      });
    } catch (error: any) {
      logger.error("Failed to fetch rules", { error: error.message });
      res.status(SERVER_ERROR_STATUS).json({
        status: "error",
        errors: [{ message: "Failed to fetch rules" }],
      });
    }
  };

  getSingleRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const rule = await this.service.getSingleRule(req.params.ruleId);
      res.status(SUCCESS_STATUS).json({ status: "success", data: rule });
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        res.status(NOT_FOUND_STATUS).json({
          status: "error",
          errors: [{ message: error.message }],
        });
        return;
      }
      res.status(SERVER_ERROR_STATUS).json({
        status: "error",
        errors: [{ message: "Failed to fetch rule" }],
      });
    }
  };

  updateRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const rule = await this.service.updateRule(req.params.ruleId, req.body as UpdateRuleDTO);
      res.status(SUCCESS_STATUS).json({ status: "success", data: rule });
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        res.status(NOT_FOUND_STATUS).json({
          status: "error",
          errors: [{ message: error.message }],
        });
        return;
      }
      res.status(SERVER_ERROR_STATUS).json({
        status: "error",
        errors: [{ message: "Failed to update rule" }],
      });
    }
  };

  toggleRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const rule = await this.service.toggleRule(req.params.ruleId, req.body.enabled);
      res.status(SUCCESS_STATUS).json({ status: "success", data: rule });
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        res.status(NOT_FOUND_STATUS).json({
          status: "error",
          errors: [{ message: error.message }],
        });
        return;
      }
      res.status(SERVER_ERROR_STATUS).json({
        status: "error",
        errors: [{ message: "Failed to toggle rule" }],
      });
    }
  };

  deleteRule = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.service.deleteRule(req.params.ruleId);
      res.status(SUCCESS_STATUS).json({ status: "success", data: null });
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        res.status(NOT_FOUND_STATUS).json({
          status: "error",
          errors: [{ message: error.message }],
        });
        return;
      }
      res.status(SERVER_ERROR_STATUS).json({
        status: "error",
        errors: [{ message: "Failed to delete rule" }],
      });
    }
  };
}