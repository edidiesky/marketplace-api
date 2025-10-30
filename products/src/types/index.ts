import { Response, Request } from "express";

export type AuthenticatedRequest = Request & {
  user: {
    role: string;
    userId: string;
    name: string;
    // permissions: Permission[];
  };
};


export enum RoleLevel {
  SUPER_ADMIN = 1,
  EXECUTIVE = 2,
  DIRECTORATE_HEAD = 3,
  DEPUTY_DIRECTOR = 4,
  ASSISTANT_DIRECTOR = 5,
  PRINCIPAL_OFFICER = 6,
  SENIOR_OFFICER = 7,
  OFFICER = 8,
  MEMBER = 9,
}

export enum Permission {
  CREATE_USER = "CREATE_USER",
  MANAGE_ROLES = "MANAGE_ROLES",
  READ_USER = "READ_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
  VIEW_REPORTS = "VIEW_REPORTS",
}