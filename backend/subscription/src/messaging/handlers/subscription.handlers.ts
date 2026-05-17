import type { Channel, ConsumeMessage } from "amqplib";
import {
  SERVICE_NAME,
  ROUTING_KEYS,
  MAX_RETRIES,
  BASE_DELAY_MS,
  getJitter,
} from "../../constants";
import { requestContext }        from "../../context/requestContext";
import logger                    from "../../utils/logger";
import { subscriptionService }   from "../../domains/subscription/subscription.service";
import { BillingPlan }           from "../../domains/subscription/subscription.model";

interface OrganizationOnboardingCompletedEvent {
  organizationId:   string;
  ownerId:          string;
  ownerEmail:       string;
  ownerName:        string;
  organizationType: string;
  billingPlan:      string;
  trialEndsAt:      string;
}

export const subscriptionHandlers: Record<
  string,
  (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ) => Promise<void>
> = {
  [ROUTING_KEYS.ORGANIZATION_ONBOARDING_COMPLETED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as OrganizationOnboardingCompletedEvent;
    const { organizationId, ownerId, billingPlan } = event;

    logger.info("sub_handler_org_onboarding_received", {
      event:          "sub_handler_org_onboarding_received",
      service:        SERVICE_NAME,
      organizationId,
      ownerId,
      requestId:      requestContext.get()?.requestId,
    });

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await subscriptionService.createSubscription({
          organizationId,
          ownerId,
          plan: (billingPlan as BillingPlan) ?? BillingPlan.FREE,
        });

        logger.info("sub_handler_subscription_created", {
          event:          "sub_handler_subscription_created",
          service:        SERVICE_NAME,
          organizationId,
          ownerId,
          requestId:      requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("sub_handler_create_failed", {
          event:          "sub_handler_create_failed",
          service:        SERVICE_NAME,
          organizationId,
          ownerId,
          attempt:        attempt + 1,
          error:          message,
          requestId:      requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          logger.error("sub_handler_all_retries_exhausted", {
            event:          "sub_handler_all_retries_exhausted",
            service:        SERVICE_NAME,
            organizationId,
            ownerId,
            requestId:      requestContext.get()?.requestId,
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