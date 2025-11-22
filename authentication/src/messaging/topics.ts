import logger from "../utils/logger";
import {
  BASE_DELAY_MS,
  BASE_EXPIRATION_SEC,
  JITTER,
  MAX_RETRIES,
  TENANT_ONBOARDING_COMPLETED_TOPIC,
} from "../constants";
export const AuthenticationTopic = {
  [TENANT_ONBOARDING_COMPLETED_TOPIC]: async (data: any) => {
    const { email, firstName, lastName, notificationId, verification_url } =
      data;
      
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        logger.info(
          "Received TENANT_ONBOARDING_COMPLETED_TOPIC data:",
          {
            data,
          }
        );

        break;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          logger.error(
            `[TENANT_ONBOARDING_COMPLETED_TOPIC] error`,
            {
              message:
                error instanceof Error
                  ? error.message
                  : "An unknown error did occurred",
            }
          );
          break;
        }
        const delay = Math.pow(2, attempt) * BASE_DELAY_MS;
        await new Promise((resolve) => setTimeout(resolve, delay + JITTER));
      }
    }

  },
};
