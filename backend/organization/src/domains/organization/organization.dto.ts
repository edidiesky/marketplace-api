import { OrganizationStatus } from "./organization.model";

export type OrganizationType = "individual" | "company" | "agency";
export type BillingPlan      = "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";

export interface CreateOrganizationDto {
  ownerId:     string;
  ownerEmail:  string;
  ownerName:   string;
  type:        string;
  billingPlan: string;
}

export interface UpdateOrganizationDto {
  name?:        string;
  description?: string;
  logo?:        string;
  website?:     string;
  phone?:       string;
  address?:     string;
}

export interface OrganizationResponseDto {
  organizationId: string;
  ownerId:        string;
  ownerEmail:     string;
  ownerName:      string;
  name:           string;
  type:           string;
  billingPlan:    string;
  trialEndsAt?:   Date;
  status:       OrganizationStatus;
  createdAt:      Date;
  updatedAt:      Date;
}

export interface OrganizationListResponseDto {
  organizations: OrganizationResponseDto[];
  totalCount:    number;
  totalPages:    number;
  page:          number;
  limit:         number;
}