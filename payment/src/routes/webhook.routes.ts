import { Router } from "express";
import { handleWebhook } from "../controllers/webhook.controller";

const router = Router();
router.post("/:gateway", handleWebhook);
export default router;
