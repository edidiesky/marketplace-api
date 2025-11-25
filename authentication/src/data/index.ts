import { Permission, RoleLevel } from "../models/User";

export const userData = [
    {
        
    }
]

const roles = [
    {
      roleCode: "PLATFORM_ADMIN",
      roleName: "Platform Administrator",
      level: RoleLevel.SUPER_ADMIN,
      scope: "PLATFORM",
      permissions: Object.values(Permission),
    },
    {
      roleCode: "TENANT_OWNER",
      roleName: "Tenant Owner",
      level: RoleLevel.EXECUTIVE,
      scope: "TENANT",
      permissions: [
        Permission.TENANT_OWNER,
        Permission.STORE_CREATE,
        Permission.MANAGE_TEAM,
        Permission.ANALYTICS_VIEW,
        Permission.FINANCIAL_VIEW,
      ],
    },
    {
      roleCode: "STORE_OWNER",
      roleName: "Store Owner",
      level: RoleLevel.DIRECTORATE_HEAD,
      scope: "STORE",
      permissions: [
        Permission.STORE_UPDATE,
        Permission.STORE_SETTINGS,
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_UPDATE,
        Permission.PRODUCT_DELETE,
        Permission.INVENTORY_MANAGE,
        Permission.ORDER_VIEW,
        Permission.ORDER_FULFILL,
        Permission.ANALYTICS_VIEW,
      ],
    },
    {
      roleCode: "STORE_MANAGER",
      roleName: "Store Manager",
      level: RoleLevel.MEMBER,
      scope: "STORE",
      permissions: [
        Permission.PRODUCT_UPDATE,
        Permission.INVENTORY_MANAGE,
        Permission.ORDER_VIEW,
        Permission.ORDER_FULFILL,
      ],
    },
    {
      roleCode: "CUSTOMER",
      roleName: "Customer",
      level: RoleLevel.MEMBER,
      scope: "PLATFORM",
      permissions: [
        Permission.CUSTOMER_BROWSE,
        Permission.CUSTOMER_PURCHASE,
        Permission.CUSTOMER_REVIEW,
      ],
    },
  ];
