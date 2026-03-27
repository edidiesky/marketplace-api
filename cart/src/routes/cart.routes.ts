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

router.get("/internal/:cartId", internalOnly, GetSingleStoreCartHandler);
router
  .route("/:storeId/store")
  .post(authenticate, validateRequest(addToCartSchema), CreateCartHandler)
  .get(authenticate, GetUserCartHandler);

router.route("/:storeId/admin/carts").get(authenticate, GetAllStoreCartHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleStoreCartHandler)
  .put(authenticate, validateRequest(updateCartItemSchema), UpdateCartHandler)
  .delete(authenticate, DeleteCartItemHandler);
export default router;


// SWAGGER DOCS
/**
 * @openapi
 * /api/v1/carts/{storeId}:
 *   post:
 *     tags: [Cart]
 *     summary: Add items to cart
 *     description: >
 *       Creates or updates the cart for the authenticated user in a given store.
 *       Acquires a Redis distributed lock to prevent concurrent writes.
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
 *             $ref: '#/components/schemas/AddToCartRequest'
 *     responses:
 *       200:
 *         description: Cart updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/v1/carts/{storeId}:
 *   get:
 *     tags: [Cart]
 *     summary: Get cart for a store
 *     description: Returns the current cart for the authenticated user in a given store.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: 692ae291a78a6f8c7ebbdd37
 *     responses:
 *       200:
 *         description: Cart found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Cart not found
 */

/**
 * @openapi
 * /api/v1/carts/{storeId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Clear cart
 *     description: Removes all items from the cart. Called after successful checkout.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *         example: 692ae291a78a6f8c7ebbdd37
 *     responses:
 *       200:
 *         description: Cart cleared
 *       404:
 *         description: Cart not found
 */

/**
 * @openapi
 * /api/v1/carts/{storeId}/items/{productId}:
 *   patch:
 *     tags: [Cart]
 *     summary: Update item quantity in cart
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: number
 *                 example: 3
 *     responses:
 *       200:
 *         description: Item updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Cart or item not found
 */