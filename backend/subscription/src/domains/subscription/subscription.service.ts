import { Types } from "mongoose";
import {
  BillingPlan,
  ISubscription,
  PLAN_FEATURES,
  SubscriptionStatus,
  IPlanFeatures,
} from "./subscription.model";
import { AppError } from "../../utils/AppError";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";
import { requestContext } from "../../context/requestContext";
import {
  publishSubscriptionCreated,
  publishSubscriptionUpgraded,
} from "../../messaging/publisher";
import {
  CheckFeatureDto,
  CreateSubscriptionDto,
  FeatureCheckResponseDto,
  SubscriptionResponseDto,
  UpgradeSubscriptionDto,
} from "./subscription.dto";
import { subscriptionRepository } from "./subscription.repository";

function toDto(sub: ISubscription): SubscriptionResponseDto {
  const now           = Date.now();
  const trialEnd      = sub.trialEndsAt?.getTime() ?? 0;
  const periodEnd     = sub.currentPeriodEnd.getTime();
  const isTrialActive = sub.status === SubscriptionStatus.TRIAL && trialEnd > now;
  const relevantEnd   = isTrialActive ? trialEnd : periodEnd;
  const daysRemaining = Math.max(
    0,
    Math.ceil((relevantEnd - now) / (1000 * 60 * 60 * 24))
  );

  return {
    subscriptionId:     sub._id.toString(),
    organizationId:     sub.organizationId,
    ownerId:            sub.ownerId.toString(),
    plan:               sub.plan,
    status:             sub.status,
    features:           sub.features,
    trialEndsAt:        sub.trialEndsAt,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd:   sub.currentPeriodEnd,
    cancelAtPeriodEnd:  sub.cancelAtPeriodEnd,
    daysRemaining,
    isTrialActive,
    createdAt:          sub.createdAt,
    updatedAt:          sub.updatedAt,
  };
}

export const subscriptionService = {
  async createSubscription(
    dto: CreateSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    const { organizationId, ownerId, plan } = dto;

    const existing = await subscriptionRepository.findByOrganizationId(
      organizationId
    );

    if (existing) {
      logger.info("subscription_already_exists", {
        event:          "subscription_already_exists",
        service:        SERVICE_NAME,
        organizationId,
        requestId:      requestContext.get()?.requestId,
      });
      return toDto(existing);
    }

    const billingPlan = plan ?? BillingPlan.FREE;
    const features    = PLAN_FEATURES[billingPlan];
    const now         = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const subscription = await subscriptionRepository.create({
      organizationId,
      ownerId:            new Types.ObjectId(ownerId),
      plan:               billingPlan,
      status:             SubscriptionStatus.TRIAL,
      features,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd:   trialEndsAt,
      cancelAtPeriodEnd:  false,
    });

    publishSubscriptionCreated({
      subscriptionId: subscription._id.toString(),
      organizationId,
      ownerId,
      plan:           billingPlan,
      status:         SubscriptionStatus.TRIAL,
      trialEndsAt:    trialEndsAt.toISOString(),
      features,
    });

    logger.info("subscription_created", {
      event:          "subscription_created",
      service:        SERVICE_NAME,
      organizationId,
      ownerId,
      plan:           billingPlan,
      requestId:      requestContext.get()?.requestId,
    });

    return toDto(subscription);
  },

  async getMySubscription(
    organizationId: string
  ): Promise<SubscriptionResponseDto> {
    const sub = await subscriptionRepository.findByOrganizationId(
      organizationId
    );
    if (!sub) {
      throw AppError.notFound(
        "No subscription found for this organization."
      );
    }
    return toDto(sub);
  },

  async getSubscriptionByOrganizationId(
    organizationId: string
  ): Promise<SubscriptionResponseDto> {
    const sub = await subscriptionRepository.findByOrganizationId(
      organizationId
    );
    if (!sub) throw AppError.notFound("Subscription not found.");
    return toDto(sub);
  },

 async upgradeSubscription(
  organizationId: string,
  dto:            UpgradeSubscriptionDto
): Promise<SubscriptionResponseDto> {
  const { plan } = dto;

  const sub = await subscriptionRepository.findByOrganizationId(
    organizationId
  );
  if (!sub) {
    throw AppError.notFound(
      "No subscription found for this organization."
    );
  }

  if (sub.plan === plan) {
    throw AppError.conflict(
      `Organization is already on the ${plan} plan.`
    );
  }

  const planOrder: Record<BillingPlan, number> = {
    [BillingPlan.FREE]:       0,
    [BillingPlan.PRO]:        1,
    [BillingPlan.ENTERPRISE]: 2,
  };

  const currentPlan = sub.plan as BillingPlan;

  if (planOrder[plan] <= planOrder[currentPlan]) {
    throw AppError.badRequest(
      "Downgrading is not supported at this time. Please contact support."
    );
  }

  const features  = PLAN_FEATURES[plan];
  const now       = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const updated = await subscriptionRepository.updateByOrganizationId(
    organizationId,
    {
      plan,
      status:             SubscriptionStatus.ACTIVE,
      features,
      previousPlan:       currentPlan,
      upgradedAt:         now,
      currentPeriodStart: now,
      currentPeriodEnd:   periodEnd,
      cancelAtPeriodEnd:  false,
    }
  );

  if (!updated) throw AppError.notFound("Subscription not found.");

  publishSubscriptionUpgraded({
    subscriptionId: sub._id.toString(),
    organizationId,
    ownerId:        sub.ownerId.toString(),
    previousPlan:   currentPlan,
    newPlan:        plan,
    features,
    upgradedAt:     now.toISOString(),
  });

  logger.info("subscription_upgraded", {
    event:        "subscription_upgraded",
    service:      SERVICE_NAME,
    organizationId,
    previousPlan: currentPlan,
    newPlan:      plan,
    requestId:    requestContext.get()?.requestId,
  });

  return toDto(updated);
},

  async checkFeature(
    dto: CheckFeatureDto
  ): Promise<FeatureCheckResponseDto> {
    const { organizationId, feature } = dto;

    const sub = await subscriptionRepository.findByOrganizationId(
      organizationId
    );

    if (!sub) {
      throw AppError.notFound(
        "No subscription found for this organization."
      );
    }

    const featureValue = sub.features[feature];
    const allowed =
      typeof featureValue === "boolean"
        ? featureValue
        : typeof featureValue === "number"
          ? featureValue === -1 || featureValue > 0
          : false;

    const limit =
      typeof featureValue === "number" ? featureValue : undefined;

    logger.debug("subscription_feature_checked", {
      event:          "subscription_feature_checked",
      service:        SERVICE_NAME,
      organizationId,
      feature,
      allowed,
      requestId:      requestContext.get()?.requestId,
    });

    return {
      organizationId,
      feature,
      allowed,
      limit,
      plan: sub.plan,
    };
  },

  // Called by a cron job or scheduled task.
  // Converts expired trials to FREE plan.
  async expireTrials(): Promise<void> {
    const expired = await subscriptionRepository.findExpiredTrials();

    for (const sub of expired) {
      await subscriptionRepository.updateByOrganizationId(
        sub.organizationId,
        {
          status:           SubscriptionStatus.ACTIVE,
          plan:             BillingPlan.FREE,
          features:         PLAN_FEATURES[BillingPlan.FREE],
        }
      );

      logger.info("subscription_trial_expired", {
        event:          "subscription_trial_expired",
        service:        SERVICE_NAME,
        organizationId: sub.organizationId,
        requestId:      requestContext.get()?.requestId,
      });
    }

    if (expired.length > 0) {
      logger.info("subscription_trials_expired_batch", {
        event:   "subscription_trials_expired_batch",
        service: SERVICE_NAME,
        count:   expired.length,
      });
    }
  },
};