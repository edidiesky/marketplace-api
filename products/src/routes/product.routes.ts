import express from "express";
import {
  CreateProductHandler,
  GetAllStoreProductHandler,
  GetSingleStoreProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
  RestoreProductHandler,
} from "../controllers/product.controller";
import { esController } from "../controllers/es.controller";
import { authenticate } from "../middleware/auth.middleware";
import { productSchema } from "../validators/product.validation";
import { validateRequest } from "../middleware/validate.middleware";

const router = express.Router();

/**
 * @openapi
 * /api/v1/products/search:
 *   get:
 *     tags:
 *       - Product Search
 *     summary: Full-text product search
 *     operationId: searchProducts
 *     description: >
 *       Queries the Elasticsearch index using a multi-match on `name` (boost 3×) and
 *       `description`. Supports price range filtering and storeId scoping.
 *       When `q` is omitted the endpoint browses all non-deleted products sorted by
 *       `createdAt` descending. ES is a read replica – MongoDB is the source of truth.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           example: "air max"
 *         description: >
 *           Full-text search term. Triggers ngram tokenisation at index time and
 *           standard tokenisation at query time so partial matches (e.g. "sne" → "sneakers") work.
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *           example: "663e1a1d7b2c3d4e5f6a7b8d"
 *         description: Scope results to a single store. Omit to search across all stores.
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           example: 10000
 *         description: Lower bound for price range filter (inclusive).
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           example: 80000
 *         description: Upper bound for price range filter (inclusive).
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Search results returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SearchResult'
 *                 total:
 *                   type: integer
 *                   example: 42
 *                 page:
 *                   type: integer
 *                   example: 1
 *       500:
 *         description: Elasticsearch query failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/search", esController.search);

/**
 * @openapi
 * /api/v1/products/autocomplete:
 *   get:
 *     tags:
 *       - Product Search
 *     summary: Product name autocomplete
 *     operationId: autocompleteProducts
 *     description: >
 *       Uses `match_phrase_prefix` on the `name` field with `max_expansions: 10`.
 *       Designed for search-as-you-type UIs. Minimum 2 characters recommended.
 *       Always filters `isDeleted: false`.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           example: "sne"
 *         description: Partial product name prefix to expand.
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *           example: "663e1a1d7b2c3d4e5f6a7b8d"
 *         description: Scope suggestions to a single store.
 *     responses:
 *       200:
 *         description: Autocomplete suggestions returned.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AutocompleteResult'
 *       400:
 *         description: Query parameter `q` is missing or too short.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/autocomplete", esController.autoComplete);

/**
 * @openapi
 * /api/v1/products/{storeId}/store:
 *   post:
 *     tags:
 *       - Product Catalog
 *     summary: Create a product in a store
 *     operationId: createProduct
 *     description: >
 *       Creates a new product scoped to the authenticated seller's store.
 *       The product document and an OutboxEvent are written in a single MongoDB
 *       transaction to prevent dual-write. A background poller (5 s interval)
 *       picks up the OutboxEvent and publishes `product.onboarding.completed`
 *       to Kafka. The Inventory service consumes this event to create the
 *       inventory record, and the ES sync consumer upserts the ES document.
 *       `storeId` in the path must match the `store` field derived from the JWT.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           example: "663e1a1d7b2c3d4e5f6a7b8d"
 *         description: MongoDB ObjectId of the store the product belongs to.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       201:
 *         description: Product created. Inventory and ES sync are eventual (outbox).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
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
 *       403:
 *         description: Authenticated user does not own this store.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: A product with this name already exists in the catalog.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     tags:
 *       - Product Catalog
 *     summary: List all products in a store
 *     operationId: listStoreProducts
 *     description: >
 *       Returns a paginated list of non-deleted products for the given store.
 *       Archived products are included unless filtered out. Results are sorted
 *       by `createdAt` descending. For search or autocomplete use the ES endpoints.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           example: "663e1a1d7b2c3d4e5f6a7b8d"
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
 *         name: category
 *         schema:
 *           type: string
 *           example: "Sneakers"
 *         description: Filter by a single category string. Matches against the category array.
 *       - in: query
 *         name: isArchive
 *         schema:
 *           type: boolean
 *         description: When `true` returns only archived products.
 *     responses:
 *       200:
 *         description: Paginated product list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListResponse'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
  .route("/:storeid/store")
  .post(authenticate, validateRequest(productSchema), CreateProductHandler)
  .get(authenticate, GetAllStoreProductHandler);

/**
 * @openapi
 * /api/v1/products/{id}:
 *   get:
 *     tags:
 *       - Product Catalog
 *     summary: Get a single product by ID
 *     operationId: getProduct
 *     description: >
 *       Fetches a single product document from MongoDB by its `_id`.
 *       Returns 404 if the product is soft-deleted (`isDeleted: true`).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "664f1b2e8a1c2d3e4f5a6b7c"
 *         description: MongoDB ObjectId of the product.
 *     responses:
 *       200:
 *         description: Product found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Product not found or has been deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Product Catalog
 *     summary: Update a product
 *     operationId: updateProduct
 *     description: >
 *       Partial update – only fields present in the request body are patched.
 *       Triggers a PRODUCT_UPDATED OutboxEvent in the same MongoDB transaction,
 *       which syncs the ES document via the es-product-sync consumer.
 *       Caller must own the store the product belongs to.
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
 *             $ref: '#/components/schemas/UpdateProductRequest'
 *     responses:
 *       200:
 *         description: Product updated. ES sync is eventual.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error on request body.
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
 *         description: Authenticated user does not own this product's store.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Product not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Product Catalog
 *     summary: Soft-delete a product
 *     operationId: deleteProduct
 *     description: >
 *       Sets `isDeleted: true`, `deletedBy`, and `deletedAt` on the product document.
 *       The product is NOT removed from MongoDB. A PRODUCT_DELETED OutboxEvent is
 *       written in the same transaction, which sets `isDeleted: true` in the ES
 *       document so it is excluded from all future search and browse queries.
 *       Inventory records are NOT removed – use the Inventory service to adjust stock.
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
 *         description: Product soft-deleted successfully.
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
 *                   example: "Product deleted successfully"
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated user does not own this product's store.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Product not found or already deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
  .route("/:id")
  .get(authenticate, GetSingleStoreProductHandler)
  .put(authenticate, UpdateProductHandler)
  .delete(authenticate, DeleteProductHandler);

/**
 * @openapi
 * /api/v1/products/{id}/restore:
 *   post:
 *     tags:
 *       - Product Catalog
 *     summary: Restore a soft-deleted product
 *     operationId: restoreProduct
 *     description: >
 *       Clears `isDeleted`, `deletedBy`, and `deletedAt` on the product document.
 *       Triggers a PRODUCT_UPDATED OutboxEvent so the ES document is re-indexed
 *       with `isDeleted: false`, making it visible in search and browse again.
 *       Only the seller who owns the store or a platform ADMIN can restore.
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
 *         description: Product restored successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated user does not own this product's store.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Product not found or is not in a deleted state.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route("/:id/restore").post(authenticate, RestoreProductHandler);

export default router;