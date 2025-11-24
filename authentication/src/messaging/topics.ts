import logger from "../utils/logger";
import {
  BASE_DELAY_MS,
  JITTER,
  MAX_RETRIES,
  NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC,
  TENANT_ONBOARDING_COMPLETED_TOPIC,
  USER_ROLLBACK_TOPIC,
} from "../constants";
import User from "../models/User";
import { sendAuthenticationMessage } from "./producer";
export const AuthenticationTopic = {
  [TENANT_ONBOARDING_COMPLETED_TOPIC]: async (data: any) => {
    const {
      tenantId,
      limits,
      ownerId,
      tenantType,
      tenantPlan,
      trialEndsAt,
      email,
    } = data;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const updatedUser = await User.findOneAndUpdate(
          { tenantId: ownerId },
          {
            $set: {
              tenantId,
              limits,
              tenantPlan: tenantPlan,
              tenantType,
              trialEndsAt,
            },
          },
          { new: true }
        );

        if (updatedUser) {
          await sendAuthenticationMessage(
            NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC,
            {
              tenantId,
              ownerId,
              email,
              tenantPlan,
              tenantType,
            }
          );
        }
        logger.info("TENANT_ONBOARDING_COMPLETED_TOPIC completed:", {
          data,
        });

        break;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          logger.error(`[TENANT_ONBOARDING_COMPLETED_TOPIC] error`, {
            message:
              error instanceof Error
                ? error.message
                : "An unknown error did occurred",
          });
          break;
        }
        const delay = Math.pow(2, attempt) * BASE_DELAY_MS;
        await new Promise((resolve) => setTimeout(resolve, delay + JITTER));
      }
    }
  },
  [USER_ROLLBACK_TOPIC]: async (data: any) => {
    const { email } = data;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await User.findOneAndDelete({
          email,
        });
        logger.info("USER_ROLLBACK_TOPIC completed:", {
          data,
        });

        break;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          logger.error(`[USER_ROLLBACK_TOPIC] error`, {
            message:
              error instanceof Error
                ? error.message
                : "An unknown error did occurred",
          });
          break;
        }
        const delay = Math.pow(2, attempt) * BASE_DELAY_MS;
        await new Promise((resolve) => setTimeout(resolve, delay + JITTER));
      }
    }
  },
};
