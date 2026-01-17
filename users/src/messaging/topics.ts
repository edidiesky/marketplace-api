import logger from "../utils/logger";
import {
  BASE_DELAY_MS,
  JITTER,
  MAX_RETRIES,
  NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC,
  TENANT_ONBOARDING_COMPLETED_TOPIC,
  USER_ROLLBACK_TOPIC,
} from "../constants";
import User, { TenantStatus } from "../models/User";
import { sendUserMessage } from "./producer";
export const UserTopic = {
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
          { _id: ownerId },
          {
            $set: {
              tenantId,
              limits,
              tenantPlan: tenantPlan,
              tenantType,
              trialEndsAt,
              tenantStatus: TenantStatus.ACTIVE,
            },
          },
          { new: true }
        );

        if (updatedUser) {
          await sendUserMessage(
            NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC,
            {
              tenantId,
              ownerId,
              tenantPlan,
              tenantType,
              limits,
              name: `${updatedUser?.firstName} ${updatedUser?.lastName}`,
              email: updatedUser?.email,
            }
          );
        }
        logger.info(
          "TENANT_ONBOARDING_COMPLETED_TOPIC action completed succesfully:",
          {
            data,
          }
        );

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
