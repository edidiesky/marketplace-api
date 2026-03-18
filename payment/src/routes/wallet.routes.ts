import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getMyWallet, reconcileWallet } from "../controllers/wallet.controller";

const router = Router();
router.get("/me", authenticate, getMyWallet);
router.get("/:walletId/reconcile", authenticate, reconcileWallet);
export default router;
