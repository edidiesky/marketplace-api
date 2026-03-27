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

router.post("/reserve", internalOnly, ReserveStockHandler);
router.post("/release", internalOnly, ReleaseStockHandler);
router.post("/commit", internalOnly, CommitStockHandler);
router.get("/check/:productId", CheckInventoryAvailabilityHandler);
router
  .route("/:storeId/store")
  .post(authenticate, validateRequest(inventorySchema), CreateInventoryHandler)
  .get(authenticate, GetAllStoreInventoryHandler);
router
  .route("/:id")
  .get(authenticate, GetSingleStoreInventoryHandler)
  .put(authenticate, UpdateInventoryHandler)
  .delete(authenticate, DeleteInventoryHandler);

export default router;


/**
 * @openapi
 * /api/v1/inventories/{storeId}/store:
 *   post:
 *     tags: [Inventory]
 *     summary: Create inventory record for a product
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInventoryRequest'
 *     responses:
 *       201:
 *         description: Inventory created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Inventory'
 *       400:
 *         description: Validation error
 */

/**
 * @openapi
 * /api/v1/inventories/{storeId}/store:
 *   get:
 *     tags: [Inventory]
 *     summary: Get all inventory for a store
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Inventory list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Inventory'
 */

/**
 * @openapi
 * /api/v1/inventories/{storeId}/{productId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get inventory for a specific product
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
 *     responses:
 *       200:
 *         description: Inventory record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Inventory'
 *       404:
 *         description: Not found
 */

/**
 * @openapi
 * /api/v1/inventories/{productId}:
 *   patch:
 *     tags: [Inventory]
 *     summary: Update inventory quantities
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
 *             $ref: '#/components/schemas/UpdateInventoryRequest'
 *     responses:
 *       200:
 *         description: Inventory updated
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Inventory]
 *     summary: Delete inventory record
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 */

/**
 * @openapi
 * /api/v1/inventories/reserve:
 *   post:
 *     tags: [Internal]
 *     summary: Reserve stock for an order item
 *     description: Internal endpoint. Called by orders service during checkout. Requires x-internal-secret header.
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
 *             $ref: '#/components/schemas/ReserveRequest'
 *     responses:
 *       204:
 *         description: Stock reserved
 *       400:
 *         description: Insufficient stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: INSUFFICIENT_STOCK
 *                 availableStock:
 *                   type: number
 *       409:
 *         description: Stock contention
 */

/**
 * @openapi
 * /api/v1/inventories/release:
 *   post:
 *     tags: [Internal]
 *     summary: Release reserved stock
 *     description: Internal endpoint. Called by orders service on checkout failure or payment failure.
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
 *             $ref: '#/components/schemas/ReleaseRequest'
 *     responses:
 *       204:
 *         description: Stock released
 */