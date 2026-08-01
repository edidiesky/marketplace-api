import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { GetPaymentStatsHandler, GetPaymentAnalyticsHandler } from "./analytics.controller";

const router = Router();

router.use(authenticate);

router.get("/stats/:storeId", GetPaymentStatsHandler);
router.get("/analytics/:storeId", GetPaymentAnalyticsHandler);

export default router;