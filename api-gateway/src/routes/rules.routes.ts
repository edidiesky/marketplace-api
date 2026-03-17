import { Router } from "express";
import { RulesController } from "../controllers/rules.controller";
import { RulesService } from "../services/rules.service";
import { RulesRepository } from "../repository/RulesRepository";
import { RulesEngine } from "../rules/engine";
import { RulesSyncPubSub } from "../pubsub/rulesSync";
import { validate } from "../middleware/validator";
import {
  createRuleSchema,
  updateRuleSchema,
  toggleRuleSchema,
  getRulesQuerySchema,
} from "../validator/rules.validators";

export function createRulesRouter(
  rulesEngine: RulesEngine,
  pubsub: RulesSyncPubSub,
): Router {
  const repo = new RulesRepository();
  const service = new RulesService(repo, rulesEngine, pubsub);
  const controller = new RulesController(service);

  const router = Router();

  router.post("/", validate(createRuleSchema), controller.createRule);
  router.get("/", validate(getRulesQuerySchema, "query"), controller.getRules);
  router.get("/:ruleId", controller.getSingleRule);
  router.put("/:ruleId", validate(updateRuleSchema), controller.updateRule);
  router.patch("/:ruleId/toggle", validate(toggleRuleSchema), controller.toggleRule);
  router.delete("/:ruleId", controller.deleteRule);

  return router;
}