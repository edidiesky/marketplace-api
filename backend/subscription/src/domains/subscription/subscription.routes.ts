import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { authenticate }    from "../../middleware/auth.middleware";
import {
  upgradeSubscriptionSchema,
} from "./subscription.validator";
import {
  GetMySubscriptionHandler,
  UpgradeSubscriptionHandler,
  GetSubscriptionByOrgIdHandler,
  CheckFeatureHandler,
} from "./subscription.controller";

const router = Router();

// GET /api/v1/subscriptions/me
router.get("/me", authenticate, GetMySubscriptionHandler);

// POST /api/v1/subscriptions/upgrade
router.post(
  "/upgrade",
  authenticate,
  validateRequest(upgradeSubscriptionSchema),
  UpgradeSubscriptionHandler
);

//  INTERNAL ROUTES 

// GET /api/v1/subscriptions/features/check?organizationId=X&feature=Y
router.get("/features/check", CheckFeatureHandler);

//  PLATFORM ADMIN ROUTES 

// GET /api/v1/subscriptions/:organizationId
router.get(
  "/:organizationId",
  authenticate,
  GetSubscriptionByOrgIdHandler
);

export default router;