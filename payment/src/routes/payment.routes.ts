import { Router } from "express";
import {
  initializePayment,
  getPaymentHistory,
  getPaymentById,
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

// router.post("/webhook/:gateway", handleWebhook);
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

/**
 * @openapi
 * /api/v1/payments/initialize:
 *   post:
 *     tags: [Payments]
 *     summary: Initialize a payment
 *     description: >
 *       Fetches order amount server-side (it never trusts client amount),
 *       calls PSP to create a payment link, saves PENDING payment record,
 *       returns redirectUrl. Order amount update is async via outbox.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InitializePaymentRequest'
 *     responses:
 *       201:
 *         description: Payment initialized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         description: Order not in payable state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/v1/payments/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment history for authenticated user
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, success, failed, refunded]
 *       - in: query
 *         name: gateway
 *         schema:
 *           type: string
 *           enum: [paystack, flutterwave]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
 *                     totalCount:
 *                       type: number
 *                     totalPages:
 *                       type: number
 */

/**
 * @openapi
 * /api/v1/payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get a single payment by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 69c5735ab3d82708c71c2cc9
 *     responses:
 *       200:
 *         description: Payment found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Payment not found
 */

/**
 * @openapi
 * /api/v1/payments/{paymentId}/refund:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate a refund
 *     description: Only successful payments can be refunded. Partial refund supported via amount field.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefundRequest'
 *     responses:
 *       200:
 *         description: Refund initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Payment not refundable
 */
