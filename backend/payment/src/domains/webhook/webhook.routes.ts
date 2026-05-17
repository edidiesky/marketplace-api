import { Router } from "express";
import { HandleWebhookHandler } from "./webhook.controller";

const router = Router();

router.post("/:gateway", HandleWebhookHandler);

export default router;