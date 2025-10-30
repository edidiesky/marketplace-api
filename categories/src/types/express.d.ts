
import { JwtPayload } from "jsonwebtoken";
import { Permission, RoleLevel } from ".";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: string;
      userType: string;
      name: string;
      permissions: Permission[];
      roleLevel?: RoleLevel;
    };
  }
}

