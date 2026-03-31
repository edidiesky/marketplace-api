import { Permission, RoleLevel } from "../models/User";
import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        name: string;
        tenantId: string;
        tenantType: string;
        tenantPlan: string;
        permissions: Permission[];
        roleLevel: RoleLevel;
      };
    }
  }
}
