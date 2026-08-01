import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { GetOrderStatsHandler, GetOrderAnalyticsHandler } from "./analytics.controller";

const router = Router();

router.get(
  "/:storeId/stats",
  authenticate,
  GetOrderStatsHandler
);

router.get(
  "/:storeId/analytics",
  authenticate,
  GetOrderAnalyticsHandler
);

export default router;