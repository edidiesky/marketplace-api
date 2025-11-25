import logger from "../utils/logger";
import {
  BASE_DELAY_MS,
  JITTER,
  MAX_RETRIES,
  TENANT_ONBOARDING_COMPLETED_TOPIC,
  TENANT_CREATION_FAILED_TOPIC,
  USER_ONBOARDING_COMPLETED_TOPIC,
  USER_ROLLBACK_TOPIC,
} from "../constants";
import { sendTenantMessage } from "./producer";
import { tenantService } from "../services";
import { TenantStatus } from "../models/Tenant";

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
          status: TenantStatus.ACTIVE,
        });

        // send another message to auth service to update the user model
        // aim to reflect tenant id, type, plans
        await sendTenantMessage(TENANT_ONBOARDING_COMPLETED_TOPIC, {
          ownerId,
          tenantId: tenant.tenantId,
          tenantType: type,
          tenantPlan: billingPlan || "free",
          trialEndsAt: tenant.trialEndsAt,
        });
        logger.info("Tenant created successfully", {
          tenantId: tenant.tenantId,
        });
        return;
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Tenant creation failed (attempt ${attempt + 1})`, {
            ownerId,
            ownerEmail,
            error: error.message,
            stack: error.stack,
          });
        }
        if (attempt === MAX_RETRIES - 1) {
          logger.error("ALL RETRIES FAILED, Sending rollback", { ownerId });
          await sendTenantMessage(TENANT_CREATION_FAILED_TOPIC, data);
        } else {
          const delay =
            Math.pow(2, attempt) * BASE_DELAY_MS + Math.random() * 1000;
          await new Promise((r) => setTimeout(r, delay));
        }
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
