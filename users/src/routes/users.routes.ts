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

router.use(authenticate);

router.get("/", GetAllUsersHandler);

router.get("/:id", GetSingleUsersHandler);
router.put(
  "/:id",
  requirePermissions([Permission.UPDATE_USER]),
  validateRequest(userUpdateSchema),
  UpdateUserHandler
);

router.delete(
  "/:id",
  requirePermissions([Permission.DELETE_USER]),
  requireMinimumRoleLevel(RoleLevel.SUPER_ADMIN),
  DeleteUserHandler
);
router.get(
  "/aggregated-users/users",
  requirePermissions([Permission.VIEW_REPORTS]),
  GetAggregatedUserHandler
);

export default router;
