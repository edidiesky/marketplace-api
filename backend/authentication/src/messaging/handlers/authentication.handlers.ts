import type { Channel, ConsumeMessage } from "amqplib";
import User from "../../domains/auth/auth.model";
import {
  ROUTING_KEYS,
  SERVICE_NAME,
  MAX_RETRIES,
  BASE_DELAY_MS,
  getJitter,
} from "../../constants";
import logger from "../../utils/logger";
import { requestContext } from "../../context/requestContext";

interface OrganizationOnboardingCompletedEvent {
  organizationId:   string;
  ownerId:          string;
  organizationType: string;
  billingPlan:      string;
  trialEndsAt?:     string;
  email:            string;
  ownerName:        string;
}

interface UserRollbackEvent {
  email:   string;
  userId?: string;
  reason?: string;
}

export const authenticationHandlers: Record<
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
    const { organizationId, ownerId, organizationType } = event;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const updatedUser = await User.findByIdAndUpdate(
          ownerId,
          {
            $set: {
              organizationId,
              organizationType,
              status: "active",
            },
          },
          { new: true }
        );

        if (!updatedUser) {
          logger.warn("auth_handler_user_not_found", {
            event:          "auth_handler_user_not_found",
            service:        SERVICE_NAME,
            ownerId,
            organizationId,
            requestId:      requestContext.get()?.requestId,
          });
          channel.nack(msg, false, false);
          return;
        }

        logger.info("auth_handler_org_onboarding_completed", {
          event:            "auth_handler_org_onboarding_completed",
          service:          SERVICE_NAME,
          ownerId,
          organizationId,
          organizationType,
          requestId:        requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("auth_handler_org_onboarding_update_failed", {
          event:     "auth_handler_org_onboarding_update_failed",
          service:   SERVICE_NAME,
          ownerId,
          organizationId,
          attempt:   attempt + 1,
          error:     message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
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

  [ROUTING_KEYS.ORGANIZATION_ONBOARDING_FAILED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as UserRollbackEvent;
    const { email, reason } = event;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await User.findOneAndDelete({ email });

        logger.info("auth_handler_user_rollback_complete", {
          event:     "auth_handler_user_rollback_complete",
          service:   SERVICE_NAME,
          email,
          reason,
          requestId: requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("auth_handler_user_rollback_failed", {
          event:     "auth_handler_user_rollback_failed",
          service:   SERVICE_NAME,
          email,
          attempt:   attempt + 1,
          error:     message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
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