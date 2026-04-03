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

/**
 * @openapi
 * /api/v1/stores:
 *   post:
 *     tags:
 *       - Stores
 *     summary: Create a new store
 *     operationId: createStore
 *     description: >
 *       Creates a store for the authenticated seller. A store is the top-level
 *       tenant boundary — all products, inventory, orders, and payments are
 *       scoped to the store's storeId. Each seller can own one store.
 *       subdomain must be unique across the platform and cannot be changed
 *       after creation. ownerId is injected from the JWT, never from the body.
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
 *         description: Store created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Store'
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
 *         description: subdomain or domain already taken by another store.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     tags:
 *       - Stores
 *     summary: List all stores
 *     operationId: getAllStores
 *     description: >
 *       Returns a paginated list of active stores. Used by the marketplace
 *       browse surface. Results sorted by createdAt descending.
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
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status. Defaults to true.
 *       - in: query
 *         name: plan
 *         schema:
 *           type: string
 *           enum: [free, basic, premium, enterprise]
 *         description: Filter by billing plan.
 *     responses:
 *       200:
 *         description: Paginated store list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreListResponse'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
  .route("")
  .post(authenticate, validateRequest(createStoreSchema), CreateStoreHandler)
  .get(authenticate, GetAllStoreHandler);

/**
 * @openapi
 * /api/v1/stores/{id}:
 *   get:
 *     tags:
 *       - Stores
 *     summary: Get a single store by ID
 *     operationId: getStore
 *     description: >
 *       Fetches a single store document by its MongoDB _id.
 *       Returns all nested objects including address, settings,
 *       subscription status, and stats.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "692ae291a78a6f8c7ebbdd37"
 *         description: MongoDB ObjectId of the store.
 *     responses:
 *       200:
 *         description: Store found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Store'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Store not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Stores
 *     summary: Update store details
 *     operationId: updateStore
 *     description: >
 *       Partial update of a store document. Only supplied fields are patched.
 *       subdomain and ownerId cannot be changed after creation.
 *       Caller must be the store owner (ownerId from JWT must match).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "692ae291a78a6f8c7ebbdd37"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStoreRequest'
 *     responses:
 *       200:
 *         description: Store updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Store'
 *       400:
 *         description: Validation failed.
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
 *       403:
 *         description: Authenticated user is not the store owner.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Store not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Stores
 *     summary: Delete a store
 *     operationId: deleteStore
 *     description: >
 *       Deletes the store document. Caller must be the store owner.
 *       This does NOT cascade to products, inventory, or orders.
 *       Dependent resources must be cleaned up separately before deletion.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "692ae291a78a6f8c7ebbdd37"
 *     responses:
 *       200:
 *         description: Store deleted.
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
 *                   example: "Store deleted successfully."
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated user is not the store owner.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Store not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
  .route("/:id")
  .get(authenticate, GetSingleStoreStoreHandler)
  .put(authenticate, UpdateStoreHandler)
  .delete(authenticate, DeleteStoreHandler);

export default router;