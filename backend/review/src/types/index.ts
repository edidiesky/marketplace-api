

export type Rating = 1 | 2 | 3 | 4 | 5;

export function isValidRating(value: unknown): value is Rating {
  return (
    typeof value === "number" && [1, 2, 3, 4, 5].includes(value)
  );
}

export interface IOnboarding {
  email:         string;
  step:          "email" | "password" | "complete";
  firstName?:    string;
  lastName?:     string;
  passwordHash?: string;
  tokenObject?: {
    token:     string;
    expiresAt: number;
  };
  createdAt?: string;
}

export interface JWTPayload {
  userId:           string;
  userType:         string;
  organizationId:   string;
  organizationType: string;
  name:             string;
}

export interface AuthenticatedUser {
  userId:            string;
  userType:          string;
  organizationId?:   string;
  organizationType?: string;
  roles?:            string[];
  name?:             string;
}

export enum Permission {
  CREATE_USER = "CREATE_USER",
  MANAGE_ROLES = "MANAGE_ROLES",
  READ_USER = "READ_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
  VIEW_REPORTS = "VIEW_REPORTS",
  CREATE_REVIEW = "CREATE_REVIEW",
  RESPOND_TO_REVIEW = "RESPOND_TO_REVIEW",    
  MANAGE_REVIEWS = "MANAGE_REVIEWS", 
  MARK_HELPFUL = "MARK_HELPFUL",
  VIEW_REVIEWS = "VIEW_REVIEWS",
}

export interface IError {
  message:string;
  stack?:string;
  status?:number;
}
