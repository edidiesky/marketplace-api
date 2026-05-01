import express from "express";
import {
  CreateCartHandler,
  GetUserCartHandler,
  GetAllStoreCartHandler,
  GetSingleStoreCartHandler,
  UpdateCartHandler,
  DeleteCartItemHandler,
} from "../controllers/cart.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  addToCartSchema,
  updateCartItemSchema,
} from "../validators/cart.validation";
import { validateRequest } from "../middleware/validate.middleware";
import { internalOnly } from "../middleware/internal";

const router = express.Router();

/**
 * @openapi
 * /api/v1/carts/internal/{cartId}:
 *   get:
 *     tags:
 *       - Cart Internal
 *     summary: Fetch a cart by ID for internal checkout use
 *     operationId: getCartInternal
 *     description: >
 *       Bypasses JWT authentication. Called by the Orders service during the checkout
 *       saga to fetch cart contents before reserving inventory.
 *       Protected exclusively by the x-internal-secret header validated
 *       by the internalOnly middleware.
 *     parameters:
 *       - in: header
 *         name: x-internal-secret
 *         required: true
 *         schema:
 *           type: string
 *         description: Shared secret validated by the internalOnly middleware.
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *           example: "664f1b2e8a1c2d3e4f5a6b7c"
 *         description: MongoDB ObjectId of the cart.
 *     responses:
 *       200:
 *         description: Cart returned for checkout processing.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Missing or invalid x-internal-secret.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Cart not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/internal/:cartId", internalOnly, GetSingleStoreCartHandler);

/**
 * @openapi
 * /api/v1/carts/{storeId}/store:
 *   post:
 *     tags:
 *       - Cart
 *     summary: Add items to cart or create cart
 *     operationId: addToCart
 *     description: >
 *       Creates a new cart or replaces the existing cart for the authenticated buyer
 *       in the given store. Each buyer has at most one cart per store enforced by a
 *       unique (userId, storeId) index. Acquires a Redis distributed lock before writing
 *       to prevent concurrent modification. expireAt controls the MongoDB TTL index.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           example: "692ae291a78a6f8c7ebbdd37"
 *         description: MongoDB ObjectId of the store.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToCartRequest'
 *     responses:
 *       200:
 *         description: Cart created or updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Joi validation failed on request body.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     tags:
 *       - Cart
 *     summary: Get the authenticated buyer's cart for a store
 *     operationId: getUserCart
 *     description: >
 *       Returns the current cart for the authenticated buyer in the given store.
 *       If any items have availabilityStatus other than "available" (set by the
 *       CART_ITEM_OUT_OF_STOCK Kafka event), those items are included with their
 *       unavailabilityReason so the UI can surface the issue to the buyer.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           example: "692ae291a78a6f8c7ebbdd37"
 *     responses:
 *       200:
 *         description: Cart found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: No active cart found for this buyer in this store.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
  .route("/:storeId/store")
  .post(authenticate, validateRequest(addToCartSchema), CreateCartHandler)
  .get(authenticate, GetUserCartHandler);

/**
 * @openapi
 * /api/v1/carts/{storeId}/admin/carts:
 *   get:
 *     tags:
 *       - Cart Admin
 *     summary: List all active carts for a store
 *     operationId: getAllStoreCarts
 *     description: >
 *       Returns a paginated list of all active carts belonging to a store.
 *       Intended for seller and admin dashboards to inspect buyer activity.
 *       Requires an authenticated seller or admin JWT scoped to this store.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           example: "692ae291a78a6f8c7ebbdd37"
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
 *         description: Paginated list of carts.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartListResponse'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated user does not own this store.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route("/:storeId/admin/carts").get(authenticate, GetAllStoreCartHandler);

/**
 * @openapi
 * /api/v1/carts/{id}:
 *   get:
 *     tags:
 *       - Cart
 *     summary: Get a single cart by ID
 *     operationId: getCart
 *     description: Fetches a single cart document by its MongoDB _id.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "664f1b2e8a1c2d3e4f5a6b7c"
 *     responses:
 *       200:
 *         description: Cart found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Cart not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Cart
 *     summary: Update a cart item quantity
 *     operationId: updateCartItem
 *     description: >
 *       Updates the quantity of a specific item in the cart.
 *       Recalculates totalPrice and quantity after the update.
 *       Acquires a Redis distributed lock before writing.
 *       Increments the version field for optimistic concurrency detection.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "664f1b2e8a1c2d3e4f5a6b7c"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCartItemRequest'
 *     responses:
 *       200:
 *         description: Cart updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Joi validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Cart or product not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Cart
 *     summary: Remove a cart item or clear the cart
 *     operationId: deleteCartItem
 *     description: >
 *       Removes a specific item from the cart by productId supplied in the request body,
 *       or clears the entire cart if no productId is supplied.
 *       After successful order completion the cart is cleared automatically by the
 *       ORDER_STOCK_COMMITTED Kafka consumer, not this endpoint.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "664f1b2e8a1c2d3e4f5a6b7c"
 *     responses:
 *       200:
 *         description: Item removed or cart cleared.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Cart item removed successfully"
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Cart not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
  .route("/:id")
  .get(authenticate, GetSingleStoreCartHandler)
  .put(authenticate, validateRequest(updateCartItemSchema), UpdateCartHandler)
  .delete(authenticate, DeleteCartItemHandler);

export default router;