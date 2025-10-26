import { Router } from "express";
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

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all users 
router.get(
  "/",
  GetAllUsersHandler
);

router.get(
  "/:id",
  // requirePermissions([Permission.READ_USER]),
  GetSingleUsersHandler
);

// Update a user (requires UPDATE_USER permission or self-access)
router.put(
  "/:id",
  requirePermissions([Permission.UPDATE_USER]),
  validateRequest(userUpdateSchema),
  UpdateUserHandler
);

// Delete a user
router.delete(
  "/:id",
  requirePermissions([Permission.DELETE_USER]),
  requireMinimumRoleLevel(RoleLevel.SUPER_ADMIN),
  DeleteUserHandler
);

// Get aggregated user data (requires VIEW_REPORTS permission)
router.get(
  "/aggregated-users/users",
  requirePermissions([Permission.VIEW_REPORTS]),
  GetAggregatedUserHandler
);


export default router;
