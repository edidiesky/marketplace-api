import { UserType, OrganizationType } from "../domains/auth/auth.model";

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
  userType:         UserType;
  organizationId:   string;
  organizationType: OrganizationType;
  name:             string;
}

export interface AuthenticatedUser {
  userId:            string;
  userType:          UserType;
  organizationId?:   string;
  organizationType?: OrganizationType;
  roles?:            string[];
  name?:             string;
}