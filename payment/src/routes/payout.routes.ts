import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  requestPayout,
  approvePayout,
  rejectPayout,
  getMyPayouts,
  getPendingPayouts,
} from "../controllers/payout.controller";

const router = Router();
router.post("/", authenticate, requestPayout);
router.get("/me", authenticate, getMyPayouts);
router.get("/pending", authenticate, getPendingPayouts);
router.patch("/:payoutRequestId/approve", authenticate, approvePayout);
router.patch("/:payoutRequestId/reject", authenticate, rejectPayout);
export default router;