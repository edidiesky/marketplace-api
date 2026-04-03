import { Router, Request, Response, NextFunction } from "express";
import {
  authenticate,
  requirePermissions,
  requireMinimumRoleLevel,
} from "../middleware/auth.middleware";
import {
  GetAllUsersHandler,
  GetSingleUsersHandler,
  UpdateUserHandler,
  GetAggregatedUserHandler,
  DeleteUserHandler,
} from "../controllers/user.controller";
import { validateRequest } from "../middleware/validate.middleware";
import { userUpdateSchema } from "../validators/user.validator";
import { Permission, RoleLevel } from "../models/User";
import { AuthenticatedRequest } from "@/types";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List all platform users
 *     operationId: getAllUsers
 *     description: >
 *       Returns a paginated list of users sorted by createdAt descending.
 *       All query params are validated and coerced before reaching the DB filter.
 *       Unknown query keys are stripped. firstName and lastName use
 *       case-insensitive regex partial match. Boolean params accept "true"/"false"
 *       or "1"/"0". limit is clamped to 100 server-side.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: userType
 *         schema:
 *           $ref: '#/components/schemas/UserType'
 *         description: Exact match filter on userType enum.
 *       - in: query
 *         name: tenantStatus
 *         schema:
 *           $ref: '#/components/schemas/TenantStatus'
 *         description: Exact match filter on tenantStatus enum.
 *       - in: query
 *         name: tenantPlan
 *         schema:
 *           $ref: '#/components/schemas/BillingPlan'
 *         description: Exact match filter on billing plan.
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [Male, Female]
 *       - in: query
 *         name: isEmailVerified
 *         schema:
 *           type: boolean
 *         description: Filter by email verification status. Accepts "true"/"false".
 *       - in: query
 *         name: isArchived
 *         schema:
 *           type: boolean
 *         description: Filter by archived status. Accepts "true"/"false".
 *       - in: query
 *         name: falseIdentificationFlag
 *         schema:
 *           type: boolean
 *         description: Filter users flagged for false identification review.
 *       - in: query
 *         name: firstName
 *         schema:
 *           type: string
 *           example: "vic"
 *         description: Case-insensitive partial match on firstName.
 *       - in: query
 *         name: lastName
 *         schema:
 *           type: string
 *           example: "ess"
 *         description: Case-insensitive partial match on lastName.
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *           format: email
 *           example: "victor@selleasi.com"
 *         description: Exact email lookup.
 *     responses:
 *       200:
 *         description: Paginated user list.
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
 *                     $ref: '#/components/schemas/UserResponse'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 120
 *                     totalPages:
 *                       type: integer
 *                       example: 6
 *       400:
 *         description: Invalid query parameter value.
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
 */
router.get(
  "/",
  (req: Request, res: Response, next: NextFunction): void =>
    void GetAllUsersHandler(req as AuthenticatedRequest, res, next),
);

/**
 * @openapi
 * /api/v1/users/aggregated-users/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get aggregated user analytics
 *     operationId: getAggregatedUsers
 *     description: >
 *       Runs a single $facet aggregation pipeline returning counts grouped by
 *       userType, tenantStatus, and tenantPlan plus platform totals
 *       (totalUsers, verifiedUsers, archivedUsers). Requires VIEW_REPORTS permission.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated user statistics.
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
 *                     type: object
 *                     properties:
 *                       byUserType:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: "SELLERS"
 *                             count:
 *                               type: integer
 *                               example: 45
 *                       byTenantStatus:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: "ACTIVE"
 *                             count:
 *                               type: integer
 *                               example: 38
 *                       byTenantPlan:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: "FREE"
 *                             count:
 *                               type: integer
 *                               example: 90
 *                       totals:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             totalUsers:
 *                               type: integer
 *                               example: 120
 *                             verifiedUsers:
 *                               type: integer
 *                               example: 98
 *                             archivedUsers:
 *                               type: integer
 *                               example: 5
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: VIEW_REPORTS permission required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Static route must stay above /:id — Express matches top to bottom
// and would treat "aggregated-users" as the :id param value otherwise.
router.get(
  "/aggregated-users/users",
  requirePermissions([Permission.VIEW_REPORTS]),
  (req: Request, res: Response, next: NextFunction): void =>
    void GetAggregatedUserHandler(req as AuthenticatedRequest, res, next),
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get a single user by ID
 *     operationId: getUser
 *     description: Fetches a single user document by MongoDB _id. passwordHash is never returned.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "663e1a1d7b2c3d4e5f6a7b8c"
 *     responses:
 *       200:
 *         description: User found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Users
 *     summary: Update a user profile
 *     operationId: updateUser
 *     description: >
 *       Partial update using __v optimistic concurrency guard.
 *       Permitted fields: firstName, lastName, phone, address, profileImage,
 *       gender, nationality. Immutable fields are stripped server-side.
 *       Returns 409 on concurrent write conflict — retry the request.
 *       Requires UPDATE_USER permission.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "663e1a1d7b2c3d4e5f6a7b8c"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: User updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserResponse'
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
 *       403:
 *         description: UPDATE_USER permission required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Concurrent write conflict. Retry the request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete a user
 *     operationId: deleteUser
 *     description: >
 *       Hard delete using __v optimistic concurrency guard.
 *       Returns 409 on concurrent write conflict.
 *       Irreversible. Requires DELETE_USER permission and SUPER_ADMIN role level.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "663e1a1d7b2c3d4e5f6a7b8c"
 *     responses:
 *       200:
 *         description: User deleted.
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
 *                   example: "User deleted successfully."
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: DELETE_USER permission and SUPER_ADMIN role level required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Concurrent write conflict. Retry the request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/:id",
  (req: Request, res: Response, next: NextFunction): void =>
    void GetSingleUsersHandler(req as AuthenticatedRequest, res, next),
);
router.put(
  "/:id",
  requirePermissions([Permission.UPDATE_USER]),
  validateRequest(userUpdateSchema),
  (req: Request, res: Response, next: NextFunction): void =>
    void UpdateUserHandler(req as AuthenticatedRequest, res, next),
);
router.delete(
  "/:id",
  requirePermissions([Permission.DELETE_USER]),
  requireMinimumRoleLevel(RoleLevel.SUPER_ADMIN),
  (req: Request, res: Response, next: NextFunction): void => {
    void DeleteUserHandler(req as AuthenticatedRequest, res, next);
  },
);

export default router;
