import { Router } from "express";
import { GetInventoryAnalyticsHandler } from "./analytics.controller";

const router = Router();

router.get("/analytics/:storeId", GetInventoryAnalyticsHandler);

export default router;