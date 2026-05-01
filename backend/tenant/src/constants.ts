export const UNAUTHORIZED_STATUS_CODE = 403;
export const BAD_REQUEST_STATUS_CODE = 400;
export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const UNAUTHENTICATED_STATUS_CODE = 401;
export const NOT_FOUND_STATUS_CODE = 404;
export const SERVER_ERROR_STATUS_CODE = 500;

export const BASE_DELAY_MS = 4000;
export const BASE_EXPIRATION_SEC = 60 * 60 * 2;
export const ONBOARDING_EXPIRATION_SEC = 60 * 15;
export const MAX_RETRIES = 7;
export const JITTER = Math.random() * 10000;

/**
 * @description NOTIFICATION TOPICS
 */
export const NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC =
  "notification.onboarding.email.confirmation.topic";
export const NOTIFICATION_ONBOARDING_PHONE_CONFIRMATION_TOPIC =
  "notification.onboarding.phone.confirmation.topic";
export const NOTIFICATION_ONBOARDING_USER_COMPLETED_TOPIC =
  "notification.onboarding.user.completed.topic";
export const NOTIFICATION_AUTHENTICATION_2FA_TOPIC =
  "notification.authentication.2fa.topic";
export const NOTIFICATION_AUTHENTICATION_RESET_PASSWORD_TOPIC =
  "notification.authentication.reset.password.topic";
export const NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC =
  "notification.tenant.onboarding.confirmation.topic";

export const TENANT_CREATION_FAILED_TOPIC = "tenant.onboarding.failed.topic";
export const USER_ROLLBACK_TOPIC = "authentication.user.rollback.topic";
export const TENANT_ONBOARDING_COMPLETED_TOPIC =
  "tenant.onboarding.completed.topic";
/**
 * @description TENANT TOPICS
 */
export const USER_ONBOARDING_COMPLETED_TOPIC =
  "user.onboarding.completed.topic";

export const TENANT_CONSUMER_TOPICS = [
  USER_ONBOARDING_COMPLETED_TOPIC,
  TENANT_CREATION_FAILED_TOPIC,
];
