import { Router } from "express";
import { handleWebhook } from "../controllers/webhook.controller";

const router = Router();
router.post("/:gateway", handleWebhook);
export default router;

/**
 * @openapi
 * /api/v1/webhooks/{gateway}:
 *   post:
 *     tags: [Webhooks]
 *     summary: Receive PSP webhook callback
 *     description: >
 *       Public endpoint. No JWT required. Validates HMAC signature from PSP.
 *       Processes payment confirmation atomically: updates payment, ledger, wallet,
 *       and writes outbox event in one MongoDB transaction.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: gateway
 *         required: true
 *         schema:
 *           type: string
 *           enum: [paystack, flutterwave]
 *       - in: header
 *         name: x-paystack-signature
 *         schema:
 *           type: string
 *         description: HMAC signature from Paystack
 *       - in: header
 *         name: verif-hash
 *         schema:
 *           type: string
 *         description: Hash from Flutterwave
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Invalid signature or amount mismatch
 */
