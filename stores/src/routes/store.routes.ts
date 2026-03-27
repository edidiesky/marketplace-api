import express from "express";
import {
  CreateStoreHandler,
  GetAllStoreHandler,
  GetSingleStoreStoreHandler,
  UpdateStoreHandler,
  DeleteStoreHandler,
} from "../controllers/store.controller";
import { authenticate } from "../middleware/auth.middleware";
import { createStoreSchema } from "../validators/store.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("")
  .post(authenticate, validateRequest(createStoreSchema), CreateStoreHandler)
  .get(authenticate, GetAllStoreHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleStoreStoreHandler)
  .put(authenticate, UpdateStoreHandler)
  .delete(authenticate, DeleteStoreHandler);
export default router;

/**
 * @openapi
 * /api/v1/stores:
 *   post:
 *     tags: [Stores]
 *     summary: Create a new store
 *     description: Each seller can create one store. Store becomes the tenant boundary for all products, orders, and inventory.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStoreRequest'
 *     responses:
 *       201:
 *         description: Store created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Store'
 *       400:
 *         description: Domain already taken or validation error
 */

/**
 * @openapi
 * /api/v1/stores/{storeId}:
 *   get:
 *     tags: [Stores]
 *     summary: Get store by ID
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
 *         description: Store found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Store'
 *       404:
 *         description: Store not found
 *   patch:
 *     tags: [Stores]
 *     summary: Update store details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStoreRequest'
 *     responses:
 *       200:
 *         description: Store updated
 *       403:
 *         description: Not the store owner
 *       404:
 *         description: Store not found
 *   delete:
 *     tags: [Stores]
 *     summary: Delete a store
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Store deleted
 *       403:
 *         description: Not the store owner
 */

/**
 * @openapi
 * /api/v1/stores/seller/{sellerId}:
 *   get:
 *     tags: [Stores]
 *     summary: Get store by seller ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Store found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Store'
 *       404:
 *         description: Store not found
 */