import { Permission, RoleLevel } from "../models/User";
import { Response, Request } from "express";

export type AuthenticatedRequest = Request & {
  user: {
    role: string;
    userId: string;
    name: string;
    permissions: Permission[];
    roleLevel?: RoleLevel;
  };
};


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
