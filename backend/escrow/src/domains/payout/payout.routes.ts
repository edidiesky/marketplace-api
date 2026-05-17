import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { authenticate }    from "../../middleware/auth.middleware";
import { requestPayoutSchema, rejectPayoutSchema } from "./payout.validator";
import {
  RequestPayoutHandler,
  ApprovePayoutHandler,
  RejectPayoutHandler,
  GetMyPayoutsHandler,
  GetPendingPayoutsHandler,
} from "./payout.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  validateRequest(requestPayoutSchema),
  RequestPayoutHandler
);

router.get("/me",      authenticate, GetMyPayoutsHandler);
router.get("/pending", authenticate, GetPendingPayoutsHandler);

router.patch(
  "/:payoutRequestId/approve",
  authenticate,
  ApprovePayoutHandler
);

router.patch(
  "/:payoutRequestId/reject",
  authenticate,
  validateRequest(rejectPayoutSchema),
  RejectPayoutHandler
);

export default router;