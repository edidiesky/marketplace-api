import express from "express";
import {
  CreateInventoryHandler,
  GetAllStoreInventoryHandler,
  GetSingleStoreInventoryHandler,
  UpdateInventoryHandler,
  DeleteInventoryHandler,
  CheckInventoryAvailabilityHandler,
  ReserveStockHandler,
  ReleaseStockHandler,
  CommitStockHandler,
} from "../controllers/inventory.controller";
import { authenticate } from "../middleware/auth.middleware";
import { inventorySchema } from "../validators/inventory.validation";
import { validateRequest } from "../middleware/validate.middleware";
import { internalOnly } from "../middleware/internal.middleware";

const router = express.Router();

/**
 * @openapi
 * /api/v1/inventories/reserve:
 *   post:
 *     tags:
 *       - Inventory Internal
 *     summary: Reserve stock for an order item
 *     operationId: reserveStock
 *     description: >
 *       Moves `quantity` units from `quantityAvailable` to `quantityReserved`
 *       using MongoDB $inc with a $gte guard inside a Redis distributed lock.
 *       Called synchronously by the Orders service during checkout saga.
 *       Fails fast with 409 if available stock is insufficient so no oversell occurs.
 *       Idempotent per orderId.
 *     parameters:
 *       - in: header
 *         name: x-internal-secret
 *         required: true
 *         schema:
 *           type: string
 *         description: Shared secret validated by the internalOnly middleware.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReserveStockRequest'
 *     responses:
 *       204:
 *         description: Stock reserved. available-N, reserved+N.
 *       400:
 *         description: Insufficient available stock.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 error:
 *                   type: string
 *                   example: "INSUFFICIENT_STOCK"
 *                 quantityAvailable:
 *                   type: number
 *                   example: 1
 *       401:
 *         description: Missing or invalid x-internal-secret.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Stock contention – distributed lock could not be acquired.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/reserve", internalOnly, ReserveStockHandler);

/**
 * @openapi
 * /api/v1/inventories/release:
 *   post:
 *     tags:
 *       - Inventory Internal
 *     summary: Release reserved stock back to available
 *     operationId: releaseStock
 *     description: >
 *       Moves `quantity` units from `quantityReserved` back to `quantityAvailable`.
 *       Called by the Orders service compensation path when checkout fails or
 *       payment is rejected. Also triggered by reservation TTL expiry.
 *       Idempotent per orderId.
 *     parameters:
 *       - in: header
 *         name: x-internal-secret
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReleaseStockRequest'
 *     responses:
 *       204:
 *         description: Stock released. available+N, reserved-N.
 *       401:
 *         description: Missing or invalid x-internal-secret.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Inventory record not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/release", internalOnly, ReleaseStockHandler);

/**
 * @openapi
 * /api/v1/inventories/commit:
 *   post:
 *     tags:
 *       - Inventory Internal
 *     summary: Permanently commit reserved stock on payment confirmation
 *     operationId: commitStock
 *     description: >
 *       Permanently deducts `quantity` units from both `quantityOnHand` and
 *       `quantityReserved`. Called by the Inventory Kafka consumer after consuming
 *       the ORDER_STOCK_COMMITTED event which is emitted following a confirmed payment.
 *       This is the final step of the three-field accounting cycle.
 *       After commit emits ORDER_STOCK_COMMITTED_TOPIC.
 *       Idempotent per orderId.
 *     parameters:
 *       - in: header
 *         name: x-internal-secret
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommitStockRequest'
 *     responses:
 *       204:
 *         description: Stock committed. onHand-N, reserved-N.
 *       401:
 *         description: Missing or invalid x-internal-secret.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Inventory record not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/commit", internalOnly, CommitStockHandler);

/**
 * @openapi
 * /api/v1/inventories/check/{productId}:
 *   get:
 *     tags:
 *       - Inventory
 *     summary: Check stock availability for a product
 *     operationId: checkInventoryAvailability
 *     description: >
 *       Returns current quantityAvailable and an isInStock boolean for the given product.
 *       Used by the storefront before allowing add-to-cart. No authentication required.
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           example: "692b1c07e389ba822fb50090"
 *         description: MongoDB ObjectId of the product to check.
 *     responses:
 *       200:
 *         description: Availability data returned.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryAvailabilityResponse'
 *       404:
 *         description: No inventory record found for this product.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/check/:productId", CheckInventoryAvailabilityHandler);

/**
 * @openapi
 * /api/v1/inventories/{storeId}/store:
 *   post:
 *     tags:
 *       - Inventory
 *     summary: Create an inventory record for a product
 *     operationId: createInventory
 *     description: >
 *       Manually creates an inventory record scoped to the given store.
 *       In normal flow this is called automatically by the Inventory Kafka consumer
 *       after consuming PRODUCT_ONBOARDING_COMPLETED. This endpoint exists for
 *       manual correction and backfill scenarios.
 *       quantityAvailable is initialised to quantityOnHand. quantityReserved starts at 0.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           example: "692ae291a78a6f8c7ebbdd37"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInventoryRequest'
 *     responses:
 *       201:
 *         description: Inventory record created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Inventory'
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
 *       409:
 *         description: Inventory record already exists for this product in this store.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     tags:
 *       - Inventory
 *     summary: List all inventory records for a store
 *     operationId: listStoreInventory
 *     description: >
 *       Returns a paginated list of all inventory records for the given store.
 *       Sorted by createdAt descending.
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
 *         description: Paginated inventory list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryListResponse'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
  .route("/:storeId/store")
  .post(authenticate, validateRequest(inventorySchema), CreateInventoryHandler)
  .get(authenticate, GetAllStoreInventoryHandler);

/**
 * @openapi
 * /api/v1/inventories/{id}:
 *   get:
 *     tags:
 *       - Inventory
 *     summary: Get a single inventory record by ID
 *     operationId: getInventory
 *     description: Fetches a single inventory document by its MongoDB _id.
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
 *         description: Inventory record found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Inventory'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Inventory record not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Inventory
 *     summary: Update an inventory record
 *     operationId: updateInventory
 *     description: >
 *       Partial update for non-accounting fields: reorderPoint, reorderQuantity,
 *       warehouseName. quantityAvailable and quantityReserved are managed exclusively
 *       by the reserve/release/commit internal endpoints to maintain accounting integrity.
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
 *             $ref: '#/components/schemas/UpdateInventoryRequest'
 *     responses:
 *       200:
 *         description: Inventory record updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Inventory'
 *       400:
 *         description: Validation error.
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
 *         description: Inventory record not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Inventory
 *     summary: Delete an inventory record
 *     operationId: deleteInventory
 *     description: >
 *       Hard deletes the inventory record. Only permitted when quantityReserved is 0.
 *       Deleting a record with active reservations will corrupt the checkout saga.
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
 *         description: Inventory record deleted.
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
 *                   example: "Inventory record deleted"
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Inventory record not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
  .route("/:id")
  .get(authenticate, GetSingleStoreInventoryHandler)
  .put(authenticate, UpdateInventoryHandler)
  .delete(authenticate, DeleteInventoryHandler);

export default router;