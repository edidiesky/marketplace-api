import { Types }           from "mongoose";
import { roleRepository }            from "../role/role.repository";
import { rolePermissionRepository }  from "../role-permissions/role-permission.repository";
import { userRoleRepository }        from "../user-roles/user-role.repository";
import { seedPermissions }           from "./permission.seed";
import { UserType }                  from "../auth/auth.model";
import logger                        from "../../utils/logger";
import { SERVICE_NAME }              from "../../constants";
import { IAction, IResource }        from "./permission.constant";

const DEFAULT_ROLE_PERMISSIONS: Record<string, Array<{ resource: IResource; action: IAction }>> = {
  [UserType.PLATFORM_ADMIN]: [
    { resource: IResource.WILDCARD, action: IAction.WILDCARD },
  ],
  [UserType.SELLER_ADMIN]: [
    { resource: IResource.STORE,        action: IAction.CREATE   },
    { resource: IResource.STORE,        action: IAction.QUERY    },
    { resource: IResource.STORE,        action: IAction.UPDATE   },
    { resource: IResource.PRODUCT,      action: IAction.CREATE   },
    { resource: IResource.PRODUCT,      action: IAction.QUERY    },
    { resource: IResource.PRODUCT,      action: IAction.UPDATE   },
    { resource: IResource.PRODUCT,      action: IAction.DELETE   },
    { resource: IResource.INVENTORY,    action: IAction.QUERY    },
    { resource: IResource.INVENTORY,    action: IAction.UPDATE   },
    { resource: IResource.ORDERS,       action: IAction.QUERY    },
    { resource: IResource.ORDERS,       action: IAction.UPDATE   },
    { resource: IResource.REVIEW,       action: IAction.QUERY    },
    { resource: IResource.REVIEW,       action: IAction.UPDATE   },
    { resource: IResource.ORGANIZATION, action: IAction.QUERY    },
    { resource: IResource.ORGANIZATION, action: IAction.UPDATE   },
    { resource: IResource.SUBSCRIPTION, action: IAction.QUERY    },
    { resource: IResource.SUBSCRIPTION, action: IAction.UPGRADE  },
    { resource: IResource.DOMAIN,       action: IAction.CREATE   },
    { resource: IResource.DOMAIN,       action: IAction.UPDATE   },
    { resource: IResource.DOMAIN,       action: IAction.DELETE   },
    { resource: IResource.AUDIT,        action: IAction.QUERY    },
  ],
  [UserType.SELLER_MEMBER]: [
    { resource: IResource.STORE,     action: IAction.QUERY  },
    { resource: IResource.PRODUCT,   action: IAction.CREATE },
    { resource: IResource.PRODUCT,   action: IAction.QUERY  },
    { resource: IResource.PRODUCT,   action: IAction.UPDATE },
    { resource: IResource.INVENTORY, action: IAction.QUERY  },
    { resource: IResource.INVENTORY, action: IAction.UPDATE },
    { resource: IResource.ORDERS,    action: IAction.QUERY  },
    { resource: IResource.REVIEW,    action: IAction.QUERY  },
  ],
  [UserType.SELLER_VIEWER]: [
    { resource: IResource.STORE,     action: IAction.QUERY },
    { resource: IResource.PRODUCT,   action: IAction.QUERY },
    { resource: IResource.INVENTORY, action: IAction.QUERY },
    { resource: IResource.ORDERS,    action: IAction.QUERY },
    { resource: IResource.REVIEW,    action: IAction.QUERY },
  ],
  [UserType.CUSTOMER]: [
    { resource: IResource.PROFILE,  action: IAction.QUERY  },
    { resource: IResource.PROFILE,  action: IAction.UPDATE },
    { resource: IResource.PRODUCT,  action: IAction.QUERY  },
    { resource: IResource.ORDERS,   action: IAction.CREATE },
    { resource: IResource.ORDERS,   action: IAction.QUERY  },
    { resource: IResource.CART,     action: IAction.CREATE },
    { resource: IResource.CART,     action: IAction.QUERY  },
    { resource: IResource.CART,     action: IAction.UPDATE },
    { resource: IResource.CART,     action: IAction.DELETE },
    { resource: IResource.REVIEW,   action: IAction.CREATE },
    { resource: IResource.REVIEW,   action: IAction.QUERY  },
    { resource: IResource.PAYMENTS, action: IAction.CREATE },
    { resource: IResource.PAYMENTS, action: IAction.QUERY  },
  ],
};

export const rbacService = {
  async seedRolesAndPermissions(): Promise<void> {
    const allPermissions = await seedPermissions();

    for (const [userType, permDefs] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const roleName = `${userType}:default`;

      let role = await roleRepository.findByName(roleName);
      if (!role) {
        role = await roleRepository.create({
          name:        roleName,
          userType:    userType as UserType,
          description: `Default role for ${userType}`,
          isSystem:    true,
          isActive:    true,
        });
        logger.info("rbac_role_seeded", {
          event:    "rbac_role_seeded",
          service:  SERVICE_NAME,
          roleName,
          userType,
        });
      }

      for (const def of permDefs) {
        const perm = allPermissions.find(
          (p) => p.resource === def.resource && p.action === def.action
        );
        if (!perm) continue;

        await rolePermissionRepository.assignPermissionToRole(
          role._id.toString(),
          perm._id.toString()
        );
      }
    }

    logger.info("rbac_seed_complete", {
      event:   "rbac_seed_complete",
      service: SERVICE_NAME,
    });
  },

  async assignDefaultRoleToUser(
    userId:   string,
    userType: UserType
  ): Promise<void> {
    const roleName = `${userType}:default`;
    const role     = await roleRepository.findByName(roleName);

    if (!role) {
      logger.warn("rbac_default_role_not_found", {
        event:    "rbac_default_role_not_found",
        service:  SERVICE_NAME,
        userId,
        userType,
        roleName,
      });
      return;
    }

    await userRoleRepository.assignRoleToUser(userId, role._id.toString());

    logger.info("rbac_role_assigned_to_user", {
      event:    "rbac_role_assigned_to_user",
      service:  SERVICE_NAME,
      userId,
      roleName,
      userType,
    });
  },

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await userRoleRepository.findByUserId(userId);
    if (userRoles.length === 0) return [];

    const roleIds = userRoles.map((ur) => ur.roleId as Types.ObjectId);
    const rolePerms = await rolePermissionRepository.findByRoleIds(roleIds);

    return rolePerms.map((rp) => {
      const perm = rp.permissionId as unknown as {
        resource: string;
        action:   string;
      };
      return `${perm.resource}:${perm.action}`;
    });
  },
};