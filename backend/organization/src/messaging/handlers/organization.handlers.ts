import type { Channel, ConsumeMessage } from "amqplib";
import { v4 as uuidv4 }   from "uuid";
import {
  SERVICE_NAME,
  ROUTING_KEYS,
  MAX_RETRIES,
  BASE_DELAY_MS,
  getJitter,
} from "../../constant";
import { requestContext } from "../../context/requestContext";
import logger             from "../../utils/logger";
import { organizationService } from "../../domains/organization/organization.service";
import {
  publishOrganizationOnboardingCompleted,
  publishOrganizationOnboardingFailed,
  publishNotificationOrgOnboarding,
} from "../publisher";

interface UserOnboardingCompletedEvent {
  userId:           string;
  organizationId:   string;
  organizationType: string;
  email:            string;
  ownerName:        string;
  billingPlan:      string;
}

export const organizationHandlers: Record<
  string,
  (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ) => Promise<void>
> = {
  [ROUTING_KEYS.USER_ONBOARDING_COMPLETED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as UserOnboardingCompletedEvent;
    const { userId, organizationType, email, ownerName, billingPlan } = event;

    logger.info("org_handler_user_onboarding_received", {
      event:            "org_handler_user_onboarding_received",
      service:          SERVICE_NAME,
      userId,
      organizationType,
      requestId:        requestContext.get()?.requestId,
    });

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const org = await organizationService.createOrganization({
          ownerId:     userId,
          ownerEmail:  email,
          ownerName,
          type:        organizationType,
          billingPlan: billingPlan ?? "FREE",
        });

        publishOrganizationOnboardingCompleted({
          organizationId:   org.organizationId,
          ownerId:          userId,
          ownerEmail:       email,
          ownerName,
          organizationType: org.type,
          billingPlan:      org.billingPlan,
          trialEndsAt:      org.trialEndsAt?.toISOString() ?? "",
        });

        publishNotificationOrgOnboarding({
          organizationId: org.organizationId,
          email,
          ownerName,
          plan:           org.billingPlan,
          notificationId: uuidv4(),
        });

        logger.info("org_handler_organization_created", {
          event:          "org_handler_organization_created",
          service:        SERVICE_NAME,
          userId,
          organizationId: org.organizationId,
          requestId:      requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("org_handler_create_failed", {
          event:     "org_handler_create_failed",
          service:   SERVICE_NAME,
          userId,
          attempt:   attempt + 1,
          error:     message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          publishOrganizationOnboardingFailed({
            ownerId: userId,
            email,
            reason:  message,
          });

          logger.error("org_handler_all_retries_exhausted", {
            event:     "org_handler_all_retries_exhausted",
            service:   SERVICE_NAME,
            userId,
            requestId: requestContext.get()?.requestId,
          });

          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) +
          getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },
};