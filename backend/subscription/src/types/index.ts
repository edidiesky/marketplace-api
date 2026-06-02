
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