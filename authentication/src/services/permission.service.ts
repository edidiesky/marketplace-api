

import { Permission, RoleLevel } from "../models/User";
import { Role, UserRole, IRole } from "../models/Role";
import logger from "../utils/logger";

export class PermissionService {
  static async getUserPermissions(userId: string): Promise<Permission[]> {
    const userRoles = await UserRole.find({
      userId,
      isActive: true,
      effectiveFrom: { $lte: new Date() },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: new Date() } }],
    }).populate<{ roleId: IRole }>("roleId");

    const permissions = new Set<Permission>();
    userRoles.forEach((ur) => {
      if (ur.roleId && ur.roleId.permissions) {
        ur.roleId.permissions.forEach((perm: string) => {
          if (Object.values(Permission).includes(perm as Permission)) {
            permissions.add(perm as Permission);
          }
        });
      }
      if (ur.scope?.permissions) {
        ur.scope.permissions.forEach((perm: string) => {
          if (Object.values(Permission).includes(perm as Permission)) {
            permissions.add(perm as Permission);
          }
        });
      }
    });

    const permissionArray = Array.from(permissions);
    logger.info("userRoles & permissions:", {
      userId,
      userRoles: userRoles.map(ur => ({
        userId: ur.userId,
        roleId: ur.roleId?._id?.toString(),
        roleCode: ur.roleId?.roleCode,
        isActive: ur.isActive,
        effectiveFrom: ur.effectiveFrom,
        effectiveTo: ur.effectiveTo,
        rolePermissions: ur.roleId?.permissions || [],
        scopePermissions: ur.scope?.permissions || [],
      })),
      permissions: permissionArray,
      service: "auth_service",
      timestamp: new Date().toISOString(),
    });

    return permissionArray;
  }

  static async getUserRoleLevel(
    userId: string,
  ): Promise<RoleLevel> {
    const userRoles = await UserRole.find({
      userId,
      isActive: true,
      effectiveFrom: { $lte: new Date() },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: new Date() } }],
    }).populate<{ roleId: IRole }>("roleId");

    const roleLevel = userRoles.reduce((minLevel, ur) => {
      if (ur.roleId && ur.roleId.level) {
        return Math.min(minLevel, ur.roleId.level);
      }
      return minLevel;
    }, RoleLevel.MEMBER);

    logger.info("User role level", {
      userId,
      roleLevel,
      service: "auth_service",
      timestamp: new Date().toISOString(),
    });
    return roleLevel || RoleLevel.MEMBER;
  }
}