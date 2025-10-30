import { Response, Request } from "express";

export type AuthenticatedRequest = Request & {
  user: {
    role: string;
    userId: string;
    name: string;
    // permissions: Permission[];
  };
};



export interface CreateColorInput {
  name: string;
  value: string;
}