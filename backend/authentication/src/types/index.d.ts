import { Permission, RoleLevel } from "../models/User";
import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        organizationId?: string;
        storeId?: string;
        roles: string[];
        permissionIds: string[];
        userType: string;
      };
    }
  }
}
