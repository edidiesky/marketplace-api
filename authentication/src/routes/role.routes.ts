import { Router, Request, Response, NextFunction } from "express";
import {
  authenticate,
  requirePermissions,
} from "../middleware/auth.middleware";
import { Permission, RoleLevel } from "../models/User";
import {
  AssignRoleToUser,
  GetAvailableRoles,
  GetUserRoles,
  RevokeUserRole,
  UpdateUserRole,
  CreateRole,
} from "../controllers/role.controller";
const router = Router();

router.post(
  "",
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void CreateRole(req, res, next);
  }
);
router.post(
  "/assign-role",
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void AssignRoleToUser(req, res, next);
  }
);

router.delete(
  "/revoke-role/:userId/:roleId",
  authenticate,
  requirePermissions([Permission.MANAGE_ROLES]),
  (req: Request, res: Response, next: NextFunction): void => {
    void RevokeUserRole(req, res, next);
  }
);

router.put(
  "/update-role",
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void UpdateUserRole(req, res, next);
  }
);
router.get(
  "/user-roles/:userId",
  authenticate,
  requirePermissions([Permission.READ_USER]),
  (req: Request, res: Response, next: NextFunction): void => {
    void GetUserRoles(req, res, next);
  }
);

router.get(
  "/available-roles",
  authenticate,
  requirePermissions([Permission.MANAGE_ROLES]),
  (req: Request, res: Response, next: NextFunction): void => {
    void GetAvailableRoles(req, res, next);
  }
);

export default router;
