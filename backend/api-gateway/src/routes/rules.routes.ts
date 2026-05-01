import { Router } from "express";
import { RulesController } from "../controllers/rules.controller";
import { RulesRepository } from "../repository/RulesRepository";
import { RulesService } from "../services/rules.service";
import { rulesEngine } from "../rules/engine";
import { rulesSyncPubSub } from "../rules/rulesSync";

const router = Router();

const repo = new RulesRepository();
const service = new RulesService(repo, rulesEngine, rulesSyncPubSub);
const controller = new RulesController(service);

router.post("/", controller.createRule);
router.get("/", controller.getRules);
router.get("/:ruleId", controller.getSingleRule);
router.put("/:ruleId", controller.updateRule);
router.patch("/:ruleId/toggle", controller.toggleRule);
router.delete("/:ruleId", controller.deleteRule);

export default router;