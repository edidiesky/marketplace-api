import { Request, Response, NextFunction } from "express";
import redisClient from "../config/redis";
import RolePermission from "../domains/role-permissions/role-permission.model";
import UserRole from "../domains/user-roles/user-role.model";
import { IAction, IResource } from "../domains/permissions/permission.model";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";
import { PERMISSION_CACHE_TTL_SEC, SERVICE_NAME } from "../constants";
import { requestContext } from "../context/requestContext";
import { AuthenticatedRequest } from "./contextMiddleware";

interface PermissionCacheEntry {
  permissions: string[];
  cachedAt:    number;
}

function permissionCacheKey(userId: string): string {
  return `permissions:${userId}`;
}

export async function invalidatePermissionCache(
  userId: string
): Promise<void> {
  await redisClient.del(permissionCacheKey(userId));
  logger.info("permission_cache_invalidated", {
    event:     "permission_cache_invalidated",
    service:   SERVICE_NAME,
    userId,
    requestId: requestContext.get()?.requestId,
  });
}

async function resolvePermissions(userId: string): Promise<string[]> {
  const cacheKey = permissionCacheKey(userId);
  const cached   = await redisClient.get(cacheKey);

  if (cached) {
    return (JSON.parse(cached) as PermissionCacheEntry).permissions;
  }

  const userRoles = await UserRole.find({ userId }).lean();
  if (userRoles.length === 0) return [];

  const roleIds = userRoles.map((ur) => ur.roleId);
  const rolePerms = await RolePermission.find({
    roleId:  { $in: roleIds },
    granted: true,
  })
    .populate("permissionId")
    .lean();

  const permissions = rolePerms.map((rp) => {
    const perm = rp.permissionId as unknown as {
      resource: string;
      action:   string;
    };
    return `${perm.resource}:${perm.action}`;
  });

  await redisClient.setex(
    cacheKey,
    PERMISSION_CACHE_TTL_SEC,
    JSON.stringify({ permissions, cachedAt: Date.now() })
  );

  return permissions;
}

export function checkPermission(resource: IResource, action: IAction) {
  return async (
    req:  Request,
    res:  Response,
    next: NextFunction
  ): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;

    try {
      const permissions = await resolvePermissions(userId);

      const hasWildcard =
        permissions.includes(`${IResource.WILDCARD}:${IAction.WILDCARD}`);
      const hasPermission =
        hasWildcard ||
        permissions.includes(`${resource}:${action}`) ||
        permissions.includes(`${resource}:${IAction.WILDCARD}`) ||
        permissions.includes(`${IResource.WILDCARD}:${action}`);

      if (!hasPermission) {
        logger.warn("permission_denied", {
          event:     "permission_denied",
          service:   SERVICE_NAME,
          userId,
          resource,
          action,
          requestId: requestContext.get()?.requestId,
        });
        const err = AppError.forbidden(
          `You do not have permission to ${action} ${resource}.`
        );
        res.status(err.statusCode).json({ success: false, message: err.message });
        return;
      }

      next();
    } catch (err) {
      logger.error("permission_check_error", {
        event:     "permission_check_error",
        service:   SERVICE_NAME,
        userId,
        error:     err instanceof Error ? err.message : String(err),
        requestId: requestContext.get()?.requestId,
      });
      next(err);
    }
  };
}