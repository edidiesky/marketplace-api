import { Router } from "express";
import { authenticate }           from "../../middleware/auth.middleware";
import { GetMyWalletHandler, ReconcileWalletHandler } from "./wallet.controller";

const router = Router();

router.get("/me",                  authenticate, GetMyWalletHandler);
router.get("/:walletId/reconcile", authenticate, ReconcileWalletHandler);

export default router;