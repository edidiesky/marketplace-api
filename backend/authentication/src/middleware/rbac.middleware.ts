import { Request, Response, NextFunction } from "express";
import redisClient from "../config/redis";
import RolePermission from "../domains/role-permissions/role-permission.model";
import UserRole from "../domains/user-roles/user-role.model";
import Permission, {
  IAction,
  IResource,
} from "../domains/permissions/permission.model";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";
import { PERMISSION_CACHE_TTL_SEC, SERVICE_NAME } from "../constants";
import { requestContext } from "../context/requestContext";

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId?: string;
    storeId?: string;
    roles: string[];
    permissionIds: string[];
    userType: string;
  };
}

interface ResolvedPermission {
  resource: IResource;
  action: IAction;
  granted: boolean;
}

const CACHE_PREFIX = "permissions";

function permissionCacheKey(userId: string): string {
  return `${CACHE_PREFIX}:${userId}`;
}

async function resolvePermissions(
  userId: string
): Promise<ResolvedPermission[]> {
  const cacheKey = permissionCacheKey(userId);

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.debug("rbac_cache_hit", {
        event: "rbac_cache_hit",
        service: SERVICE_NAME,
        userId,
      });
      return JSON.parse(cached) as ResolvedPermission[];
    }
  } catch (err) {
    logger.warn("rbac_cache_read_failed", {
      event: "rbac_cache_read_failed",
      service: SERVICE_NAME,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Cache miss: resolve from DB
  const userRoles = await UserRole.find({
    userId,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).lean();

  const roleIds = userRoles.map((ur) => ur.roleId);

  const rolePermissions = await RolePermission.find({
    roleId: { $in: roleIds },
  })
    .populate<{ permissionId: { resource: IResource; action: IAction } }>(
      "permissionId",
      "resource action"
    )
    .lean();

  const resolved: ResolvedPermission[] = rolePermissions.map((rp) => ({
    resource: rp.permissionId.resource,
    action: rp.permissionId.action,
    granted: rp.granted,
  }));

  try {
    await redisClient.set(
      cacheKey,
      JSON.stringify(resolved),
      "EX",
      PERMISSION_CACHE_TTL_SEC
    );
  } catch (err) {
    logger.warn("rbac_cache_write_failed", {
      event: "rbac_cache_write_failed",
      service: SERVICE_NAME,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return resolved;
}

function hasPermission(
  permissions: ResolvedPermission[],
  requiredResource: IResource,
  requiredAction: IAction
): boolean {
  return permissions.some((p) => {
    if (!p.granted) return false;
    const resourceMatch =
      p.resource === IResource.WILDCARD || p.resource === requiredResource;
    const actionMatch =
      p.action === IAction.WILDCARD || p.action === requiredAction;
    return resourceMatch && actionMatch;
  });
}

/**
 * Middleware factory.
 * Usage: router.delete("/:id", authenticate, checkPermission(IResource.PRODUCT, IAction.DELETE), handler)
 */
export function checkPermission(
  resource: IResource,
  action: IAction
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user?.userId) {
      const err = AppError.unauthorized("Authentication required");
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }

    const { userId } = authReq.user;

    try {
      const permissions = await resolvePermissions(userId);
      const allowed = hasPermission(permissions, resource, action);

      logger.info("rbac_check", {
        event: "rbac_check",
        service: SERVICE_NAME,
        userId,
        resource,
        action,
        allowed,
        organizationId: requestContext.get()?.organizationId,
        storeId: requestContext.get()?.storeId,
      });

      if (!allowed) {
        const err = AppError.forbidden(
          `Permission denied: ${action} on ${resource}`
        );
        res
          .status(err.statusCode)
          .json({ success: false, message: err.message });
        return;
      }

      next();
    } catch (err) {
      logger.error("rbac_resolution_failed", {
        event: "rbac_resolution_failed",
        service: SERVICE_NAME,
        userId,
        resource,
        action,
        error: err instanceof Error ? err.message : String(err),
      });
      const appErr = AppError.internal("Permission resolution failed");
      res
        .status(appErr.statusCode)
        .json({ success: false, message: appErr.message });
    }
  };
}

/**
 * Call this when a permission is revoked to invalidate the user's cache.
 * The next request will do a fresh DB fetch.
 */
export async function invalidatePermissionCache(userId: string): Promise<void> {
  try {
    await redisClient.del(permissionCacheKey(userId));
    logger.info("rbac_cache_invalidated", {
      event: "rbac_cache_invalidated",
      service: SERVICE_NAME,
      userId,
    });
  } catch (err) {
    logger.error("rbac_cache_invalidation_failed", {
      event: "rbac_cache_invalidation_failed",
      service: SERVICE_NAME,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}