import { Router } from "express";
import {
  initializePayment,
  getPaymentHistory,
  getPaymentById,
  handleWebhook,
  initiateRefund,
} from "../controllers/payment.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import {
  initializePaymentSchema,
  refundSchema,
  paginationSchema,
} from "../validators/payment.validation";
import Joi from "joi";

const router = Router();

router.post("/webhook/:gateway", handleWebhook);
router.use(authenticate);
router
  .route("/initialize")
  .post(validateRequest(initializePaymentSchema), initializePayment);

router
  .route("/history")
  .get(validateRequest(paginationSchema, "query"), getPaymentHistory);

router
  .route("/:id")
  .get(validateRequest(Joi.object({ id: Joi.string().required() }), "params"), getPaymentById);

router
  .route("/:paymentId/refund")
  .post(
    validateRequest(Joi.object({ paymentId: Joi.string().required() }), "params"),
    validateRequest(refundSchema),
    initiateRefund
  );

export default router;