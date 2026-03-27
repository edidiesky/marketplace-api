import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import {
  CheckoutHandler,
  AddShippingHandler,
  GetUserOrdersHandler,
  GetOrderHandler,
  UpdateFulfillmentHandler,
} from "../controllers/order.controller";
import {
  CheckoutSchema,
  FulfillmentSchema,
  ShippingSchema,
} from "../validators/order.validation";

const router = express.Router();

/**
 * @openapi
 * /api/v1/orders/{storeId}/checkout:
 *   post:
 *     tags: [Checkout]
 *     summary: Create a new order from cart
 *     description: >
 *       Fetches cart server-side, reserves inventory for each item atomically,
 *       and creates an order in PAYMENT_PENDING state. Idempotent via requestId.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: 692ae291a78a6f8c7ebbdd37
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cartId, requestId]
 *             properties:
 *               cartId:
 *                 type: string
 *                 example: 69bdadb4c5979ae29c7519f3
 *               requestId:
 *                 type: string
 *                 format: uuid
 *                 example: f1332326-ac69-4fc6-b8c4-53806e287866
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Insufficient stock or cart empty
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 error:
 *                   type: string
 *                   example: One or more items are unavailable
 *                 failedItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                       productTitle:
 *                         type: string
 *                       reason:
 *                         type: string
 *                         example: Out of stock
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Circuit breaker open
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 error:
 *                   type: string
 *                   example: Service orders is currently unavailable
 *                 retryAfter:
 *                   type: number
 *                   example: 30
 */
router.post(
  "/:storeId/checkout",
  authenticate,
  validateRequest(CheckoutSchema),
  CheckoutHandler
);

/**
 * @openapi
 * /api/v1/orders/{orderId}/shipping:
 *   patch:
 *     tags: [Shipping]
 *     summary: Add or update shipping address on an order
 *     description: >
 *       Only allowed when order is in PAYMENT_PENDING or PAYMENT_INITIATED state.
 *       Shipping is frozen once order reaches COMPLETED or FAILED.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         example: 69c572f77b95832e7af4cca2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShippingAddress'
 *     responses:
 *       200:
 *         description: Shipping updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Order not in a mutable state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not the order owner
 *       404:
 *         description: Order not found
 */
router.patch(
  "/:orderId/shipping",
  authenticate,
  validateRequest(ShippingSchema),
  AddShippingHandler
);

/**
 * @openapi
 * /api/v1/orders/{storeId}/store:
 *   get:
 *     tags: [Orders]
 *     summary: Get all orders for a store
 *     description: Returns paginated orders for a given store. Seller-scoped.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: 692ae291a78a6f8c7ebbdd37
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: orderStatus
 *         schema:
 *           type: string
 *           enum: [payment_pending, payment_initiated, completed, failed, out_of_stock]
 *     responses:
 *       200:
 *         description: Paginated orders
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedOrders'
 *       401:
 *         description: Unauthorized
 */
router.get("/:storeId/store", authenticate, GetUserOrdersHandler);

/**
 * @openapi
 * /api/v1/orders/detail/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get a single order by ID
 *     description: Returns full order details including cart items, shipping, and receipt URL.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 69c572f77b95832e7af4cca2
 *     responses:
 *       200:
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/detail/:id", authenticate, GetOrderHandler);

/**
 * @openapi
 * /api/v1/orders/{orderId}/fulfillment:
 *   patch:
 *     tags: [Fulfillment]
 *     summary: Update fulfillment status
 *     description: >
 *       Seller-only. Valid transitions: unfulfilled -> preparing -> dispatched -> delivered.
 *       Order must be in COMPLETED payment status before fulfillment can be updated.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         example: 69c572f77b95832e7af4cca2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [preparing, dispatched, delivered, delivery_failed]
 *                 example: dispatched
 *               trackingNumber:
 *                 type: string
 *                 example: GIG123456789NG
 *               courierName:
 *                 type: string
 *                 example: GIG Logistics
 *     responses:
 *       200:
 *         description: Fulfillment status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid transition or order not completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not the order seller
 *       404:
 *         description: Order not found
 */
router.patch(
  "/:orderId/fulfillment",
  authenticate,
  validateRequest(FulfillmentSchema),
  UpdateFulfillmentHandler
);

export default router;