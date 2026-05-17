import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { authenticate }    from "../../middleware/auth.middleware";
import {
  initializePaymentSchema,
  refundSchema,
  paymentHistorySchema,
} from "./payment.validator";
import {
  InitializePaymentHandler,
  GetPaymentHistoryHandler,
  GetPaymentByIdHandler,
  InitiateRefundHandler,
  GetPaymentStatsHandler,
} from "./payment.controller";

const router = Router();

router.use(authenticate);

router.post(
  "/initialize",
  validateRequest(initializePaymentSchema),
  InitializePaymentHandler
);

router.get(
  "/history",
  validateRequest(paymentHistorySchema, "query"),
  GetPaymentHistoryHandler
);

router.get(
  "/stats/:storeId",
  GetPaymentStatsHandler
);

router.get("/:id", GetPaymentByIdHandler);

router.post(
  "/:paymentId/refund",
  validateRequest(refundSchema),
  InitiateRefundHandler
);

export default router;