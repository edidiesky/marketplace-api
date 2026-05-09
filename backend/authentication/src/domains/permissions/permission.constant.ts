/**
 * 1. action 2. resource 3. role 4. enabled 5.
 */

import { UserType } from "@/models/User";

export enum IResource {
  PROFILE = "profile",
  ROLE = "role",
  PAYMENTS = "payments",
  INVENTORY = "inventory",
  PRODUCT = "product",
  ORDERS = "orders",
  REVIEW = "review",
  COLORS = "colors",
  VIEW = "view",
  CART = "cart",
  AUDIT = "audit",
  NOTIFICATION = "notification",
  STORE = "store",
  ORGANIZATION = "organization",
  SUBSCRIPTION = "subscription",
  DOMAIN = "domain",
  WILDCARD = "*",
}

export enum IAction {
  "create" = "create",
  "query" = "query",
  "update" = "update",
  "delete" = "delete",
  "rotate" = "rotate",
  "invoke" = "invoke",
  "upgrade" = "upgrade",
  WILDCARD = "*",
}

export interface SeedPermission {
  role: UserType;
  resource: IResource;
  action: IAction;
  granted: boolean;
}

export const PERMISSION_SEED: SeedPermission[] = [
  {
    role: UserType.PLATFORM_ADMIN,
    resource: IResource.WILDCARD,
    action: IAction.WILDCARD,
    granted: true,
  },
];
