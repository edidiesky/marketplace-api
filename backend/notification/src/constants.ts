export const SERVICE_NAME = "notification-service";
export const RABBITMQ_URL = process.env.RABBITMQ_URL!;

export const MAX_RETRIES   = 3;
export const BASE_DELAY_MS = 1_000;
export const IDEMPOTENCY_TTL_SEC = 60 * 60 * 2;

export function getJitter(): number {
  return Math.random() * 1_000;
}

export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const BAD_REQUEST_STATUS_CODE          = 400;
export const UNAUTHENTICATED_STATUS_CODE      = 401;
export const UNAUTHORIZED_STATUS_CODE         = 403;
export const NOT_FOUND_STATUS_CODE            = 404;
export const SERVER_ERROR_STATUS_CODE         = 500;

export const EXCHANGES = {
  NOTIFICATION:     "selleasi.notification",
  NOTIFICATION_DLX: "selleasi.notification.dlx",
  AUTHENTICATION:   "selleasi.authentication",
  ORDERS:           "selleasi.orders",
  PAYMENT:          "selleasi.payment",
  INVENTORY:        "selleasi.inventory",
  ORGANIZATION:     "selleasi.organization",
  STORES:           "selleasi.stores",
} as const;

export const ROUTING_KEYS = {
  NOTIFICATION_EMAIL_CONFIRMATION:  "notification.onboarding.email.confirmation",
  NOTIFICATION_2FA:                 "notification.authentication.2fa",
  NOTIFICATION_RESET_PASSWORD:      "notification.authentication.reset.password",
  NOTIFICATION_ORG_ONBOARDING:      "notification.organization.onboarding.completed",
  NOTIFICATION_STORE_ONBOARDING:    "notification.store.onboarding.completed",
  NOTIFICATION_PAYMENT_SUCCESS:     "notification.payment.success",
  NOTIFICATION_PAYMENT_FAILED:      "notification.payment.failed",
  NOTIFICATION_ORDER_COMPLETED:     "notification.order.completed",
  NOTIFICATION_LOW_STOCK:           "notification.inventory.low",
} as const;

export type NotificationRoutingKey =
  (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export const QUEUES = {
  EMAIL_CONFIRMATION:  "selleasi.notification.email.confirmation.queue",
  TWO_FA:              "selleasi.notification.2fa.queue",
  RESET_PASSWORD:      "selleasi.notification.reset.password.queue",
  ORG_ONBOARDING:      "selleasi.notification.org.onboarding.queue",
  STORE_ONBOARDING:    "selleasi.notification.store.onboarding.queue",
  PAYMENT_SUCCESS:     "selleasi.notification.payment.success.queue",
  PAYMENT_FAILED:      "selleasi.notification.payment.failed.queue",
  ORDER_COMPLETED:     "selleasi.notification.order.completed.queue",
  LOW_STOCK:           "selleasi.notification.low.stock.queue",
} as const;