import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { GetProductAnalyticsHandler } from "./analytics.controller";

const router = Router();

router.get(
  "/analytics/:storeId",
  authenticate,
  GetProductAnalyticsHandler
);

export default router;