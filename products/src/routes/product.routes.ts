import express from "express";
import {
  CreateProductHandler,
  GetAllStoreProductHandler,
  GetSingleStoreProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
  RestoreProductHandler
} from "../controllers/product.controller";
import { authenticate } from "../middleware/auth.middleware";
import { productSchema } from "../validators/product.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("/:storeid/store")
  .post(authenticate, validateRequest(productSchema), CreateProductHandler)
  .get(authenticate, GetAllStoreProductHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleStoreProductHandler)
  .put(authenticate, UpdateProductHandler)
  .delete(authenticate, DeleteProductHandler);

router
  .route("/:id/restore").post(authenticate, RestoreProductHandler);
export default router;


/**
 * @openapi
 * /api/v1/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     description: >
 *       Creates product and writes to the transactional outbox atomically. A worker running and pulling pending outbox gets the pending outbox events
 *       and  publishes product.onboarding.completed event to Kafka broker so the inventory service can then consume the events, and then creates the inventory record atomatically.
 *       without incurring any dual write phenomenon.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 */

/**
 * @openapi
 * /api/v1/products/{storeId}:
 *   get:
 *     tags: [Products]
 *     summary: Get all products for a store
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
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Product list
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
 *                     $ref: '#/components/schemas/Product'
 */

/**
 * @openapi
 * /api/v1/products/{storeId}/{productId}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product
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
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Not found
 */

/**
 * @openapi
 * /api/v1/products/{productId}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product
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
 *             $ref: '#/components/schemas/UpdateProductRequest'
 *     responses:
 *       200:
 *         description: Product updated
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
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