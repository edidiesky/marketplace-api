import express from "express";
import {
  CreateTenantHandler,
  GetAllTenantHandler,
  GetSingleTenantHandler,
  UpdateTenantHandler,
  DeleteTenantHandler,
} from "../controllers/tenant.controller";
import { authenticate } from "../middleware/auth.middleware";
import { tenantSchema } from "../validators/tenant.validation";
import { validateRequest } from "../middleware/validate.middleware";

const router = express.Router();

/**
 * @openapi
 * /api/v1/tenants/:
 *   post:
 *     tags:
 *       - Tenants
 *     summary: Manually provision a tenant
 *     operationId: createTenant
 *     description: >
 *       Creates a tenant record. In normal flow this is called automatically by the
 *       Kafka consumer after consuming USER_ONBOARDING_COMPLETED_TOPIC.
 *       This endpoint exists for admin provisioning and backfill only.
 *       On success the service emits TENANT_ONBOARDING_COMPLETED_TOPIC which patches
 *       the user record in the Auth service with tenantId and sets tenantStatus to ACTIVE.
 *       billingPlan defaults to FREE. The pre-save hook sets trialEndsAt to 7 days
 *       from creation and applies the correct quota limits for the plan.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTenantRequest'
 *     responses:
 *       201:
 *         description: Tenant created. TENANT_ONBOARDING_COMPLETED_TOPIC emitted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
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
 *         description: Tenant already exists for this ownerId.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     tags:
 *       - Tenants
 *     summary: List all tenants
 *     operationId: getAllTenants
 *     description: >
 *       Returns a paginated list of all tenants. Sorted by createdAt descending.
 *       Requires MANAGE_TENANTS permission.
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
 *           $ref: '#/components/schemas/TenantStatus'
 *         description: Filter by tenant status.
 *       - in: query
 *         name: billingPlan
 *         schema:
 *           $ref: '#/components/schemas/BillingPlan'
 *         description: Filter by billing plan.
 *       - in: query
 *         name: type
 *         schema:
 *           $ref: '#/components/schemas/TenantType'
 *         description: Filter by tenant type.
 *     responses:
 *       200:
 *         description: Paginated tenant list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TenantListResponse'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: MANAGE_TENANTS permission required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
  .route("/")
  .post(authenticate, validateRequest(tenantSchema), CreateTenantHandler)
  .get(authenticate, GetAllTenantHandler);

/**
 * @openapi
 * /api/v1/tenants/{id}:
 *   get:
 *     tags:
 *       - Tenants
 *     summary: Get a single tenant by ID
 *     operationId: getTenant
 *     description: >
 *       Fetches a single tenant document by its MongoDB _id.
 *       Returns all fields including limits, subscription info, and virtual fields
 *       isTrialActive and isActive.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "664f1b2e8a1c2d3e4f5a6b7c"
 *         description: MongoDB ObjectId of the tenant document.
 *     responses:
 *       200:
 *         description: Tenant found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tenant not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Tenants
 *     summary: Update a tenant
 *     operationId: updateTenant
 *     description: >
 *       Partial update. Only supplied fields are patched.
 *       Changing billingPlan triggers the pre-save hook which automatically
 *       resets the limits object to the correct values for the new plan.
 *       tenantId and ownerId cannot be changed after creation.
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
 *             $ref: '#/components/schemas/UpdateTenantRequest'
 *     responses:
 *       200:
 *         description: Tenant updated. Limits adjusted if billingPlan changed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
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
 *       404:
 *         description: Tenant not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Tenants
 *     summary: Delete a tenant
 *     operationId: deleteTenant
 *     description: >
 *       Sets status to DELETED and records deletedAt timestamp.
 *       Does not cascade to stores, products, orders, or inventory.
 *       Dependent resources must be deactivated separately.
 *       Requires MANAGE_TENANTS permission.
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
 *         description: Tenant deleted. Status set to DELETED.
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
 *                   example: "Tenant deleted successfully."
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: MANAGE_TENANTS permission required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tenant not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router
  .route("/:id")
  .get(authenticate, GetSingleTenantHandler)
  .put(authenticate, UpdateTenantHandler)
  .delete(authenticate, DeleteTenantHandler);

export default router;