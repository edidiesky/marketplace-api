import {
  BillingPlan,
  IPlanFeatures,
  SubscriptionStatus,
} from "./subscription.model";

export interface CreateSubscriptionDto {
  organizationId: string;
  ownerId:        string;
  plan?:          BillingPlan;
}

export interface UpgradeSubscriptionDto {
  plan: BillingPlan;
}

export interface CheckFeatureDto {
  organizationId: string;
  feature:        keyof IPlanFeatures;
}

export interface SubscriptionResponseDto {
  subscriptionId:     string;
  organizationId:     string;
  ownerId:            string;
  plan:               BillingPlan;
  status:             SubscriptionStatus;
  features:           IPlanFeatures;
  trialEndsAt?:       Date;
  currentPeriodStart: Date;
  currentPeriodEnd:   Date;
  cancelAtPeriodEnd:  boolean;
  daysRemaining:      number;
  isTrialActive:      boolean;
  createdAt:          Date;
  updatedAt:          Date;
}

export interface FeatureCheckResponseDto {
  organizationId: string;
  feature:        string;
  allowed:        boolean;
  limit?:         number;
  plan:           BillingPlan;
}