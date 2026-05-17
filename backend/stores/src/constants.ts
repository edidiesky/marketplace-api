export const SERVICE_NAME = "stores-service";
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
  STORES:       "selleasi.stores",
  STORES_DLX:   "selleasi.stores.dlx",
  NOTIFICATION: "selleasi.notification",
} as const;

export const ROUTING_KEYS = {
  STORE_CREATED:                 "store.created",
  STORE_DOMAIN_VERIFIED:         "store.domain.verified",
  NOTIFICATION_STORE_ONBOARDING: "notification.store.onboarding.completed",
} as const;

export type StoreRoutingKey =
  (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export const QUEUES = {} as const;

export const PERMISSION_CACHE_TTL_SEC = 60 * 5;
export const STORE_CACHE_TTL          = 3600;