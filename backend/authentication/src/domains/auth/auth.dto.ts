import { UserType, OrganizationType } from "./auth.model";

//  ONBOARDING 

//  email + password together
export interface InitiateOnboardingDto {
  email:           string;
  password:        string;
  confirmPassword: string;
  notificationId?: string;
}

export interface ConfirmEmailTokenDto {
  email: string;
  token: string;
}

//  user details after email verified
export interface RegisterUserDto {
  email:     string;
  firstName: string;
  lastName:  string;
  userType:  UserType;
  phone:     string;
  address?:  string;
  gender?:   string;
}

export interface RegisterUserResponseDto {
  userId:           string;
  email:            string;
  userType:         UserType;
  organizationType: OrganizationType;
}

//  LOGIN 

export interface InitiateLoginDto {
  email:           string;
  password:        string;
  idempotencyKey?: string;
  ip?:             string;
  userAgent?:      string;
}

export interface Verify2FADto {
  email: string;
  otp:   string;
}

export interface AuthTokensDto {
  accessToken:  string;
  refreshToken: string;
  user: {
    userId:           string;
    userType:         UserType;
    organizationId:   string;
    organizationType: OrganizationType;
    name:             string;
    roles:            string[];
  };
}

export interface RefreshTokenDto {
  refreshToken: string;
  ip?:          string;
  userAgent?:   string;
}

//  PASSWORD 

export interface ResetPasswordDto {
  token:       string;
  newPassword: string;
}

export interface LogoutDto {
  token?:        string;
  refreshToken?: string;
  jwtSecret:     string;
}