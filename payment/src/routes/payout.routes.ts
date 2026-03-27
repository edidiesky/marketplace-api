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

/**
 * @openapi
 * /api/v1/payouts:
 *   get:
 *     tags: [Payouts]
 *     summary: Get payout requests for seller
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Payout list
 *   post:
 *     tags: [Payouts]
 *     summary: Request a payout
 *     description: Seller requests withdrawal from wallet to bank account.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayoutRequest'
 *     responses:
 *       201:
 *         description: Payout request created
 *       400:
 *         description: Insufficient wallet balance
 */

/**
 * @openapi
 * /api/v1/payouts/{payoutId}/approve:
 *   patch:
 *     tags: [Payouts]
 *     summary: Approve a payout request
 *     description: Admin only. Triggers Paystack Transfer API.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payout approved and transfer initiated
 *       403:
 *         description: Not admin
 */

/**
 * @openapi
 * /api/v1/payouts/{payoutId}/reject:
 *   patch:
 *     tags: [Payouts]
 *     summary: Reject a payout request
 *     description: Admin only.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payout rejected
 *       403:
 *         description: Not admin
 */