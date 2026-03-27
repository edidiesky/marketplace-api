import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getMyWallet, reconcileWallet } from "../controllers/wallet.controller";

const router = Router();
router.get("/me", authenticate, getMyWallet);
router.get("/:walletId/reconcile", authenticate, reconcileWallet);
export default router;
/**
 * @openapi
 * /api/v1/wallets/{sellerId}:
 *   get:
 *     tags: [Wallet]
 *     summary: Get wallet for a seller
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wallet details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Wallet'
 *       404:
 *         description: Wallet was not found
 */

/**
 * @openapi
 * /api/v1/wallets/{sellerId}/balance:
 *   get:
 *     tags: [Wallet]
 *     summary: Get current wallet balance
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   example: 1370.85
 *                 currency:
 *                   type: string
 *                   example: NGN
 */
