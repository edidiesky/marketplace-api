import { DirectorateType, Permission, RoleLevel } from "../models/User";
import { JwtPayload } from "jsonwebtoken";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: string;
      userType: string;
      name: string;
      permissions: Permission[];
      directorates: DirectorateType[];
      roleLevel?: RoleLevel;
    };
  }
}

