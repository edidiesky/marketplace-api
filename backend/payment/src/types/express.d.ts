import { JwtPayload } from "jsonwebtoken";
import { Permission, RoleLevel, UserType } from ".";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: string;
      role: UserType;
      name: string;
      permissions: Permission[];
      roleLevel?: RoleLevel;
      tenantId: string;
      tenantPlan: string;
      tenantType: string;
    };
  }
}
