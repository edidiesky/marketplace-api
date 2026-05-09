import logger from "../../utils/logger";
import { IAction, IResource } from "./permission.constant";
import { IPermission, Permission } from "./permission.model";

interface SeedPermission {
  resource: IResource;
  action: IAction;
  description: string;
}

const PERMISSION_SEED: SeedPermission[] = [
  // Wildcard
  { resource: IResource.WILDCARD,      action: IAction.WILDCARD, description: "Full platform access" },

  // Profile
  { resource: IResource.PROFILE,       action: IAction.QUERY,    description: "View own profile" },
  { resource: IResource.PROFILE,       action: IAction.UPDATE,   description: "Update own profile" },
  { resource: IResource.PROFILE,       action: IAction.DELETE,   description: "Delete own profile" },

  // Role
  { resource: IResource.ROLE,          action: IAction.CREATE,   description: "Create roles" },
  { resource: IResource.ROLE,          action: IAction.QUERY,    description: "View roles" },
  { resource: IResource.ROLE,          action: IAction.UPDATE,   description: "Update roles" },
  { resource: IResource.ROLE,          action: IAction.DELETE,   description: "Delete roles" },

  // Users
  { resource: IResource.USERS,         action: IAction.QUERY,    description: "View users" },
  { resource: IResource.USERS,         action: IAction.UPDATE,   description: "Update users" },
  { resource: IResource.USERS,         action: IAction.DELETE,   description: "Delete users" },

  // Store
  { resource: IResource.STORE,         action: IAction.CREATE,   description: "Create stores" },
  { resource: IResource.STORE,         action: IAction.QUERY,    description: "View stores" },
  { resource: IResource.STORE,         action: IAction.UPDATE,   description: "Update stores" },
  { resource: IResource.STORE,         action: IAction.DELETE,   description: "Delete stores" },

  // Product
  { resource: IResource.PRODUCT,       action: IAction.CREATE,   description: "Create products" },
  { resource: IResource.PRODUCT,       action: IAction.QUERY,    description: "View products" },
  { resource: IResource.PRODUCT,       action: IAction.UPDATE,   description: "Update products" },
  { resource: IResource.PRODUCT,       action: IAction.DELETE,   description: "Delete products" },

  // Inventory
  { resource: IResource.INVENTORY,     action: IAction.CREATE,   description: "Create inventory" },
  { resource: IResource.INVENTORY,     action: IAction.QUERY,    description: "View inventory" },
  { resource: IResource.INVENTORY,     action: IAction.UPDATE,   description: "Update inventory" },
  { resource: IResource.INVENTORY,     action: IAction.DELETE,   description: "Delete inventory" },

  // Orders
  { resource: IResource.ORDERS,        action: IAction.CREATE,   description: "Create orders" },
  { resource: IResource.ORDERS,        action: IAction.QUERY,    description: "View orders" },
  { resource: IResource.ORDERS,        action: IAction.UPDATE,   description: "Update orders" },
  { resource: IResource.ORDERS,        action: IAction.DELETE,   description: "Delete orders" },

  // Payments
  { resource: IResource.PAYMENTS,      action: IAction.CREATE,   description: "Initiate payments" },
  { resource: IResource.PAYMENTS,      action: IAction.QUERY,    description: "View payments" },
  { resource: IResource.PAYMENTS,      action: IAction.UPDATE,   description: "Update payments" },

  // Cart
  { resource: IResource.CART,          action: IAction.CREATE,   description: "Create cart" },
  { resource: IResource.CART,          action: IAction.QUERY,    description: "View cart" },
  { resource: IResource.CART,          action: IAction.UPDATE,   description: "Update cart" },
  { resource: IResource.CART,          action: IAction.DELETE,   description: "Delete cart" },

  // Review
  { resource: IResource.REVIEW,        action: IAction.CREATE,   description: "Create reviews" },
  { resource: IResource.REVIEW,        action: IAction.QUERY,    description: "View reviews" },
  { resource: IResource.REVIEW,        action: IAction.UPDATE,   description: "Update reviews" },
  { resource: IResource.REVIEW,        action: IAction.DELETE,   description: "Delete reviews" },

  // Organization
  { resource: IResource.ORGANIZATION,  action: IAction.CREATE,   description: "Create organization" },
  { resource: IResource.ORGANIZATION,  action: IAction.QUERY,    description: "View organization" },
  { resource: IResource.ORGANIZATION,  action: IAction.UPDATE,   description: "Update organization" },
  { resource: IResource.ORGANIZATION,  action: IAction.DELETE,   description: "Delete organization" },

  // Subscription
  { resource: IResource.SUBSCRIPTION,  action: IAction.QUERY,    description: "View subscription" },
  { resource: IResource.SUBSCRIPTION,  action: IAction.UPGRADE,  description: "Upgrade subscription" },

  // Domain
  { resource: IResource.DOMAIN,        action: IAction.CREATE,   description: "Register custom domain" },
  { resource: IResource.DOMAIN,        action: IAction.UPDATE,   description: "Update domain" },
  { resource: IResource.DOMAIN,        action: IAction.DELETE,   description: "Remove domain" },

  // Audit
  { resource: IResource.AUDIT,         action: IAction.QUERY,    description: "View audit logs" },

  // Notification
  { resource: IResource.NOTIFICATION,  action: IAction.QUERY,    description: "View notifications" },
];

export async function seedPermissions(): Promise<IPermission[]> {
  const results: IPermission[] = [];

  for (const seed of PERMISSION_SEED) {
    const existing = await Permission.findOne({
      resource: seed.resource,
      action: seed.action,
    });

    if (existing) {
      results.push(existing);
      continue;
    }

    const created = await Permission.create({
      ...seed,
      isSystem: true,
    });

    results.push(created);
    logger.info("permission_seeded", {
      event: "permission_seeded",
      resource: seed.resource,
      action: seed.action,
    });
  }

  logger.info("permissions_seed_complete", {
    event: "permissions_seed_complete",
    total: results.length,
  });

  return results;
}