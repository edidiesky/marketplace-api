export const SERVICE_NAME = "organization-service";
export const RABBITMQ_URL = process.env.RABBITMQ_URL!;

export const MAX_RETRIES   = 3;
export const BASE_DELAY_MS = 1_000;

export function getJitter(): number {
  return Math.random() * 1_000;
}

export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const BAD_REQUEST_STATUS_CODE          = 400;
export const UNAUTHENTICATED_STATUS_CODE      = 401;
export const UNAUTHORIZED_STATUS_CODE         = 403;
export const NOT_FOUND_STATUS_CODE            = 404;
export const CONFLICT_STATUS_CODE             = 409;
export const SERVER_ERROR_STATUS_CODE         = 500;

export const EXCHANGES = {
  AUTHENTICATION:       "selleasi.authentication",
  ORGANIZATION:         "selleasi.organization",
  ORGANIZATION_DLX:     "selleasi.organization.dlx",
  NOTIFICATION:         "selleasi.notification",
  SUBSCRIPTION:         "selleasi.subscription",
} as const;

export const ROUTING_KEYS = {
  // Consumed
  USER_ONBOARDING_COMPLETED:         "user.onboarding.completed",
  // Published
  ORGANIZATION_ONBOARDING_COMPLETED: "organization.onboarding.completed",
  ORGANIZATION_ONBOARDING_FAILED:    "organization.onboarding.failed",
  NOTIFICATION_ORG_ONBOARDING:       "notification.organization.onboarding.completed",
} as const;

export type OrgRoutingKey =
  (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export const QUEUES = {
  USER_ONBOARDING: "selleasi.organization.user.onboarding.queue",
} as const;

export const PERMISSION_CACHE_TTL_SEC = 60 * 5;