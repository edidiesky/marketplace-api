import logger from "../utils/logger";
import {
  BASE_DELAY_MS,
  JITTER,
  MAX_RETRIES,
  NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC,
} from "../constants";

export const NotificationTopic = {
  [NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC]: async (data: any) => {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        logger.info(
          "Received NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC data:",
          {
            data,
          }
        );
        break;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          logger.error(
            `[NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC] error`,
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
