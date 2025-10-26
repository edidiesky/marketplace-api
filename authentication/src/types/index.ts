import {Permission, RoleLevel } from "../models/User";
import { Response, Request } from "express";

export type AuthenticatedRequest = Request & {
  user: {
    userType: string;
    userId: string;
    name: string;
    permissions: Permission[];
    roleLevel?: RoleLevel;
  };
};
