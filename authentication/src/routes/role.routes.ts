import { Router, Request, Response, NextFunction } from "express";
import { validateRequest } from "../middleware/validate.middleware";
import {
  createRoleSchema,
  roleAssignmentSchema,
} from "../validators/auth.validator";
import {
  authenticate,
  requireMinimumRoleLevel,
  requirePermissions,
} from "../middleware/auth.middleware";
import createLimiter from "../utils/customRateLimiter";
import { Permission, RoleLevel } from "../models/User";
import {
  AssignRoleToUser,
  GetAvailableRoles,
  GetUserRoles,
  RevokeUserRole,
  UpdateUserRole,
  CreateRole,
  seedSuperAdmin,
} from "../controllers/role.controller";
// import { sendUserMessage } from "../messaging/producer";
const router = Router();

router.post(
  "/seed",
  createLimiter({
    windowMs: 5 * 60 * 1000,
    max: 5,
    prefix: "auth",
    onLimitReached: (req) => {},
  }),
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void seedSuperAdmin(req, res, next);
  }
);

// Assign role to user
router.post(
  "",
  createLimiter({
    windowMs: 5 * 60 * 1000,
    max: 5,
    prefix: "auth",
    onLimitReached: (req) => {},
  }),
  authenticate,
  validateRequest(createRoleSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void CreateRole(req, res, next);
  }
);

// Assign role to user
router.post(
  "/assign-role",
  createLimiter({
    windowMs: 5 * 60 * 1000,
    max: 5,
    prefix: "auth",
    onLimitReached: (req) => {},
  }),
  authenticate,
  requirePermissions([Permission.MANAGE_ROLES]),
  requireMinimumRoleLevel(RoleLevel.DEPUTY_DIRECTOR),
  validateRequest(roleAssignmentSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void AssignRoleToUser(req, res, next);
  }
);

// Revoke user role
router.delete(
  "/revoke-role/:userId/:roleId",
  createLimiter({
    windowMs: 5 * 60 * 1000,
    max: 5,
    prefix: "auth",
    onLimitReached: (req) => {},
  }),
  authenticate,
  requirePermissions([Permission.MANAGE_ROLES]),
  requireMinimumRoleLevel(RoleLevel.DEPUTY_DIRECTOR),
  (req: Request, res: Response, next: NextFunction): void => {
    void RevokeUserRole(req, res, next);
  }
);

// Update user role
router.put(
  "/update-role",
  authenticate,
  requirePermissions([Permission.MANAGE_ROLES]),
  requireMinimumRoleLevel(RoleLevel.DEPUTY_DIRECTOR),
  validateRequest(roleAssignmentSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void UpdateUserRole(req, res, next);
  }
);

// Get user roles
router.get(
  "/user-roles/:userId",
  createLimiter({
    windowMs: 5 * 60 * 1000,
    max: 5,
    prefix: "auth",
    onLimitReached: (req) => {},
  }),
  authenticate,
  requirePermissions([Permission.READ_USER]),
  (req: Request, res: Response, next: NextFunction): void => {
    void GetUserRoles(req, res, next);
  }
);

// Get available roles for assignment
router.get(
  "/available-roles",
  createLimiter({
    windowMs: 5 * 60 * 1000,
    max: 5,
    prefix: "auth",
    onLimitReached: (req) => {},
  }),
  authenticate,
  requirePermissions([Permission.MANAGE_ROLES]),
  (req: Request, res: Response, next: NextFunction): void => {
    void GetAvailableRoles(req, res, next);
  }
);

export default router;
