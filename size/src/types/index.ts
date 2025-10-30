import { Response, Request } from "express";

export type AuthenticatedRequest = Request & {
  user: {
    role: string;
    userId: string;
    name: string;
    // permissions: Permission[];
  };
};



export interface CreateSizeInput {
  name: string;
  value: string;
}