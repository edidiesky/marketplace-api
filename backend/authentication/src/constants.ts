export const SERVICE_NAME = "authentication-service";
export const RABBITMQ_URL = process.env.RABBITMQ_URL!;

export const MAX_RETRIES = 3;
export const BASE_DELAY_MS = 1_000;
export const BASE_EXPIRATION_SEC = 60 * 60 * 2;
export const ONBOARDING_EXPIRATION_SEC = 60 * 15;
export const REDIS_EXPIRATION_MIN = 60 * 5;
export const PERMISSION_CACHE_TTL_SEC = 60 * 5;

export function getJitter(): number {
  return Math.random() * 1_000;
}

export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const BAD_REQUEST_STATUS_CODE = 400;
export const UNAUTHENTICATED_STATUS_CODE = 401;
export const UNAUTHORIZED_STATUS_CODE = 403;
export const NOT_FOUND_STATUS_CODE = 404;
export const CONFLICT_STATUS_CODE = 409;
export const SERVER_ERROR_STATUS_CODE = 500;

export const EXCHANGES = {
  AUTHENTICATION:     "selleasi.authentication",
  AUTHENTICATION_DLX: "selleasi.authentication.dlx",
  ORGANIZATION:       "selleasi.organization",
  NOTIFICATION:       "selleasi.notification",
} as const;

export const ROUTING_KEYS = {
  USER_ONBOARDING_COMPLETED:         "user.onboarding.completed",
  USER_ROLLBACK:                     "authentication.user.rollback",
  NOTIFICATION_EMAIL_CONFIRMATION:   "notification.onboarding.email.confirmation",
  NOTIFICATION_PHONE_CONFIRMATION:   "notification.onboarding.phone.confirmation",
  NOTIFICATION_2FA:                  "notification.authentication.2fa",
  NOTIFICATION_RESET_PASSWORD:       "notification.authentication.reset.password",
  ORGANIZATION_ONBOARDING_COMPLETED: "organization.onboarding.completed",
  ORGANIZATION_ONBOARDING_FAILED:    "organization.onboarding.failed",
} as const;

export type AuthRoutingKey =
  (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export const QUEUES = {
  USER_ONBOARDING: "selleasi.authentication.user.onboarding.queue",
  USER_ROLLBACK:   "selleasi.authentication.user.rollback.queue",
} as const;