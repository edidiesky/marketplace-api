import mongoose from "mongoose";
import { IOutboxEvent, IOutboxEventType } from "../models/OutboxEvent";
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

export enum RoleLevel {
  SUPER_ADMIN = 1,
  EXECUTIVE = 2,
  DIRECTORATE_HEAD = 3,
  MEMBER = 4,
}

export enum Permission {
  CREATE_USER = "CREATE_USER",
  MANAGE_ROLES = "MANAGE_ROLES",
  READ_USER = "READ_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
  VIEW_REPORTS = "VIEW_REPORTS",
}

export interface IOutboxRepo {
  getPendingOutbox: () => Promise<IOutboxEvent[]>;
  createOutbox: (
    type: IOutboxEventType,
    payload: Record<string, any>,
    session: mongoose.ClientSession,
  ) => Promise<IOutboxEvent>;
  markOutboxAsProccessed: (id: string) => Promise<IOutboxEvent | null>;
  incrementRetry: (id: string, error: string) => Promise<void>;
}
