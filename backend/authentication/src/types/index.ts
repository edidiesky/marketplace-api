import { Permission, RoleLevel } from "../models/User";
import { Response, Request } from "express";

export interface IOnboarding {
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  step: "email" | "password" | "complete";
  tokenObject?: {
    token: string;
    expiresAt: number;
  };
}

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId?: string;
    storeId?: string;
    roles: string[];
    permissionIds: string[];
    userType: string;
  };
}
