import logger from "../utils/logger";
import {
  BASE_DELAY_MS,
  JITTER,
  MAX_RETRIES,
  TENANT_CREATION_FAILED_TOPIC,
  USER_ONBOARDING_COMPLETED_TOPIC,
  USER_ROLLBACK_TOPIC,
} from "../constants";
import { sendTenantMessage } from "./producer";
import { tenantService } from "../services";
export const TenantTopic = {
  [USER_ONBOARDING_COMPLETED_TOPIC]: async (data: any) => {
    const { ownerId, ownerEmail, ownerName, type, billingPlan } = data;
    logger.info("Tenant Onboarding data:", data);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const tenant = await tenantService.createTenant(ownerId, {
          ownerEmail,
          ownerName,
          type,
          billingPlan,
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        logger.info("Tenant created successfully", {
          tenantId: tenant.tenantId,
        });
        return;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          logger.error(`[USER_ONBOARDING_COMPLETED_TOPIC] error`, {
            message:
              error instanceof Error
                ? error.message
                : "An unknown error did occurred",
          });
          await sendTenantMessage(TENANT_CREATION_FAILED_TOPIC, {
            data,
          });
          break;
        }
        const delay = Math.pow(2, attempt) * BASE_DELAY_MS;
        await new Promise((resolve) => setTimeout(resolve, delay + JITTER));
      }
    }
  },
  [TENANT_CREATION_FAILED_TOPIC]: async (data: any) => {
    const { ownerId, ownerEmail, ownerName, type, billingPlan } = data;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await sendTenantMessage(USER_ROLLBACK_TOPIC, {
          data,
        });
        logger.info("Sent USER_ROLLBACK_TOPIC data successfully:", {
          data,
        });
        break;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          logger.error(`[TENANT_CREATION_FAILED_TOPIC] error`, {
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
