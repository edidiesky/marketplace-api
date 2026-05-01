import { Router, Request, Response, NextFunction } from "express";
import {
  authenticate,
  requirePermissions,
} from "../middleware/auth.middleware";
import { Permission } from "../models/User";
import {
  AssignRoleToUser,
  GetAvailableRoles,
  GetUserRoles,
  RevokeUserRole,
  UpdateUserRole,
  CreateRole,
} from "../controllers/role.controller";

const router = Router();

/**
 * @openapi
 * /api/v1/roles:
 *   post:
 *     tags:
 *       - Roles
 *     summary: Create a new role
 *     operationId: createRole
 *     description: >
 *       Creates a custom role with a set of permissions scoped to the tenant from the JWT.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoleRequest'
 *     responses:
 *       201:
 *         description: Role created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                       example: "Store Manager"
 *                     permissions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Validation failed or duplicate role name.
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
router.post(
  "",
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void CreateRole(req, res, next);
  },
);

/**
 * @openapi
 * /api/v1/roles/assign-role:
 *   post:
 *     tags:
 *       - Roles
 *     summary: Assign a role to a user
 *     operationId: assignRole
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignRoleRequest'
 *     responses:
 *       200:
 *         description: Role assigned.
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
 *                   example: "Role assigned successfully."
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User or role not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/assign-role",
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void AssignRoleToUser(req, res, next);
  },
);

/**
 * @openapi
 * /api/v1/roles/revoke-role/{userId}/{roleId}:
 *   delete:
 *     tags:
 *       - Roles
 *     summary: Revoke a role from a user
 *     operationId: revokeRole
 *     description: Requires MANAGE_ROLES permission.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           example: "663e1a1d7b2c3d4e5f6a7b8c"
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           example: "664f1b2e8a1c2d3e4f5a6b7c"
 *     responses:
 *       200:
 *         description: Role revoked.
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
 *                   example: "Role revoked successfully."
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: MANAGE_ROLES permission required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User or role assignment not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  "/revoke-role/:userId/:roleId",
  authenticate,
  requirePermissions([Permission.MANAGE_ROLES]),
  (req: Request, res: Response, next: NextFunction): void => {
    void RevokeUserRole(req, res, next);
  },
);

/**
 * @openapi
 * /api/v1/roles/update-role:
 *   put:
 *     tags:
 *       - Roles
 *     summary: Update an existing role
 *     operationId: updateRole
 *     description: Changes take effect on the next login for any user who has this role assigned.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleRequest'
 *     responses:
 *       200:
 *         description: Role updated.
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
 *                   example: "Role updated successfully."
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Role not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
  "/update-role",
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void UpdateUserRole(req, res, next);
  },
);

/**
 * @openapi
 * /api/v1/roles/user-roles/{userId}:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get all roles assigned to a user
 *     operationId: getUserRoles
 *     description: Requires READ_USER permission.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           example: "663e1a1d7b2c3d4e5f6a7b8c"
 *     responses:
 *       200:
 *         description: User roles returned.
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
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       permissions:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Permission'
 *       403:
 *         description: READ_USER permission required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/user-roles/:userId",
  authenticate,
  requirePermissions([Permission.READ_USER]),
  (req: Request, res: Response, next: NextFunction): void => {
    void GetUserRoles(req, res, next);
  },
);

/**
 * @openapi
 * /api/v1/roles/available-roles:
 *   get:
 *     tags:
 *       - Roles
 *     summary: List all available roles for the tenant
 *     operationId: getAvailableRoles
 *     description: Requires MANAGE_ROLES permission.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Available roles returned.
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
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: "Store Manager"
 *                       permissions:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Permission'
 *       403:
 *         description: MANAGE_ROLES permission required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/available-roles",
  authenticate,
  requirePermissions([Permission.MANAGE_ROLES]),
  (req: Request, res: Response, next: NextFunction): void => {
    void GetAvailableRoles(req, res, next);
  },
);

export default router;
