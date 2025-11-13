import logger from "../utils/logger";
import {
  BASE_DELAY_MS,
  BASE_EXPIRATION_SEC,
  JITTER,
  MAX_RETRIES,
  NOTIFICATION_AUTHENTICATION_2FA_TOPIC,
  NOTIFICATION_AUTHENTICATION_RESET_PASSWORD_TOPIC,
  NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC,
  NOTIFICATION_ONBOARDING_PHONE_CONFIRMATION_TOPIC,
  NOTIFICATION_ONBOARDING_USER_COMPLETED_TOPIC,
  NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC,
} from "../constants";
import redisClient from "../config/redis";
import { EmailService } from "../services/email.service";

export const NotificationTopic = {
  [NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC]: async (data: any) => {
    const { email, firstName, lastName, notificationId, verification_url } =
      data;
    try {
      const notification_lock_key = `notification:${email}:${notificationId}`;
      const notification_email_key = `email:${email}:${notificationId}`;
      const IS_LOCKED_ACK = await redisClient.setnx(
        notification_lock_key,
        "locked"
      );
      if (!IS_LOCKED_ACK) {
        logger.info("Notification has already been processed", {
          notification_lock_key,
        });
        return;
      }

      await redisClient.expire(notification_lock_key, BASE_EXPIRATION_SEC);

      if (email && !(await redisClient.get(notification_email_key))) {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            let emailService = new EmailService();
            await emailService.sendUserOnboardingConfirmationEmail(email, {
              verification_url,
              email,
              firstName,
              lastName,
            });
            await redisClient.setex(
              notification_email_key,
              BASE_EXPIRATION_SEC,
              "true"
            );
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
      }
    } catch (error) {}
  },

  // NOTIFICATION_ONBOARDING_PHONE_CONFIRMATION_TOPIC
  [NOTIFICATION_ONBOARDING_PHONE_CONFIRMATION_TOPIC]: async (data: any) => {
    const { email, firstName, lastName, notificationId, verification_url } =
      data;
    try {
      const notification_lock_key = `notification:${email}:${notificationId}`;
      const notification_email_key = `email:${email}:${notificationId}`;
      const IS_LOCKED_ACK = await redisClient.setnx(
        notification_lock_key,
        "locked"
      );
      if (!IS_LOCKED_ACK) {
        logger.info("Notification has already been processed", {
          notification_lock_key,
        });
        return;
      }

      await redisClient.expire(notification_lock_key, BASE_EXPIRATION_SEC);

      if (email && !(await redisClient.get(notification_email_key))) {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            let emailService = new EmailService();
            await emailService.sendUserOnboardingConfirmationEmail(email, {
              verification_url,
              email,
              firstName,
              lastName,
            });
            await redisClient.setex(
              notification_email_key,
              BASE_EXPIRATION_SEC,
              "true"
            );
            logger.info(
              "Received NOTIFICATION_ONBOARDING_PHONE_CONFIRMATION_TOPIC data:",
              {
                data,
              }
            );

            break;
          } catch (error) {
            if (attempt === MAX_RETRIES) {
              logger.error(
                `[NOTIFICATION_ONBOARDING_PHONE_CONFIRMATION_TOPIC] error`,
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
      }
    } catch (error) {}
  },
  // NOTIFICATION_ONBOARDING_USER_COMPLETED_TOPIC
  [NOTIFICATION_ONBOARDING_USER_COMPLETED_TOPIC]: async (data: any) => {
    const { email, firstName, lastName, notificationId, verification_url } =
      data;
    try {
      const notification_lock_key = `notification:${email}:${notificationId}`;
      const notification_email_key = `email:${email}:${notificationId}`;
      const IS_LOCKED_ACK = await redisClient.setnx(
        notification_lock_key,
        "locked"
      );
      if (!IS_LOCKED_ACK) {
        logger.info("Notification has already been processed", {
          notification_lock_key,
        });
        return;
      }

      await redisClient.expire(notification_lock_key, BASE_EXPIRATION_SEC);

      if (email && !(await redisClient.get(notification_email_key))) {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            let emailService = new EmailService();
            await emailService.sendUserOnboardingConfirmationEmail(email, {
              verification_url,
              email,
              firstName,
              lastName,
            });
            await redisClient.setex(
              notification_email_key,
              BASE_EXPIRATION_SEC,
              "true"
            );
            logger.info(
              "Received NOTIFICATION_ONBOARDING_USER_COMPLETED_TOPIC data:",
              {
                data,
              }
            );

            break;
          } catch (error) {
            if (attempt === MAX_RETRIES) {
              logger.error(
                `[NOTIFICATION_ONBOARDING_USER_COMPLETED_TOPIC] error`,
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
      }
    } catch (error) {}
  },

  // NOTIFICATION_AUTHENTICATION_2FA_TOPIC
  [NOTIFICATION_AUTHENTICATION_2FA_TOPIC]: async (data: any) => {
    const { email, firstName, lastName, notificationId, verification_url } =
      data;
    try {
      const notification_lock_key = `notification:${email}:${notificationId}`;
      const notification_email_key = `email:${email}:${notificationId}`;
      const IS_LOCKED_ACK = await redisClient.setnx(
        notification_lock_key,
        "locked"
      );
      if (!IS_LOCKED_ACK) {
        logger.info("Notification has already been processed", {
          notification_lock_key,
        });
        return;
      }

      await redisClient.expire(notification_lock_key, BASE_EXPIRATION_SEC);

      if (email && !(await redisClient.get(notification_email_key))) {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            let emailService = new EmailService();
            await emailService.sendUserOnboardingConfirmationEmail(email, {
              verification_url,
              email,
              firstName,
              lastName,
            });
            await redisClient.setex(
              notification_email_key,
              BASE_EXPIRATION_SEC,
              "true"
            );
            logger.info(
              "Received NOTIFICATION_AUTHENTICATION_2FA_TOPIC data:",
              {
                data,
              }
            );

            break;
          } catch (error) {
            if (attempt === MAX_RETRIES) {
              logger.error(`[NOTIFICATION_AUTHENTICATION_2FA_TOPIC] error`, {
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
      }
    } catch (error) {}
  },

  // NOTIFICATION_AUTHENTICATION_RESET_PASSWORD_TOPIC
  [NOTIFICATION_AUTHENTICATION_RESET_PASSWORD_TOPIC]: async (data: any) => {
    const { email, firstName, lastName, notificationId, verification_url } =
      data;
    try {
      const notification_lock_key = `notification:${email}:${notificationId}`;
      const notification_email_key = `email:${email}:${notificationId}`;
      const IS_LOCKED_ACK = await redisClient.setnx(
        notification_lock_key,
        "locked"
      );
      if (!IS_LOCKED_ACK) {
        logger.info("Notification has already been processed", {
          notification_lock_key,
        });
        return;
      }

      await redisClient.expire(notification_lock_key, BASE_EXPIRATION_SEC);

      if (email && !(await redisClient.get(notification_email_key))) {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            let emailService = new EmailService();
            await emailService.sendUserOnboardingConfirmationEmail(email, {
              verification_url,
              email,
              firstName,
              lastName,
            });
            await redisClient.setex(
              notification_email_key,
              BASE_EXPIRATION_SEC,
              "true"
            );
            logger.info(
              "Received NOTIFICATION_AUTHENTICATION_RESET_PASSWORD_TOPIC data:",
              {
                data,
              }
            );

            break;
          } catch (error) {
            if (attempt === MAX_RETRIES) {
              logger.error(
                `[NOTIFICATION_AUTHENTICATION_RESET_PASSWORD_TOPIC] error`,
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
      }
    } catch (error) {}
  },

  // NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC
  [NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC]: async (data: any) => {
    const { email, firstName, lastName, notificationId, verification_url } =
      data;
    try {
      const notification_lock_key = `notification:${email}:${notificationId}`;
      const notification_email_key = `email:${email}:${notificationId}`;
      const IS_LOCKED_ACK = await redisClient.setnx(
        notification_lock_key,
        "locked"
      );
      if (!IS_LOCKED_ACK) {
        logger.info("Notification has already been processed", {
          notification_lock_key,
        });
        return;
      }

      await redisClient.expire(notification_lock_key, BASE_EXPIRATION_SEC);

      if (email && !(await redisClient.get(notification_email_key))) {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            let emailService = new EmailService();
            await emailService.sendUserOnboardingConfirmationEmail(email, {
              verification_url,
              email,
              firstName,
              lastName,
            });
            await redisClient.setex(
              notification_email_key,
              BASE_EXPIRATION_SEC,
              "true"
            );
            logger.info(
              "Received NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC data:",
              {
                data,
              }
            );

            break;
          } catch (error) {
            if (attempt === MAX_RETRIES) {
              logger.error(
                `[NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC] error`,
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
      }
    } catch (error) {}
  },
};
