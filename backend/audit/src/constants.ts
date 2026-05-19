export const SERVICE_NAME = "audit-service";
export const RABBITMQ_URL = process.env.RABBITMQ_URL!;

export const MAX_RETRIES   = 3;
export const BASE_DELAY_MS = 1_000;

export function getJitter(): number {
  return Math.random() * 1_000;
}

export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const BAD_REQUEST_STATUS_CODE          = 400;
export const UNAUTHENTICATED_STATUS_CODE      = 401;
export const UNAUTHORIZED_STATUS_CODE         = 403;
export const NOT_FOUND_STATUS_CODE            = 404;
export const SERVER_ERROR_STATUS_CODE         = 500;

export const EXCHANGES = {
  AUDIT:          "selleasi.audit",
  AUDIT_DLX:      "selleasi.audit.dlx",
  AUTHENTICATION: "selleasi.authentication",
  ORGANIZATION:   "selleasi.organization",
  STORES:         "selleasi.stores",
  ORDERS:         "selleasi.orders",
  PAYMENT:        "selleasi.payment",
  INVENTORY:      "selleasi.inventory",
  REVIEW:         "selleasi.review",
  NOTIFICATION:   "selleasi.notification",
} as const;

export const ROUTING_KEYS = {
  USER_REGISTERED:           "user.registered",
  USER_LOGIN:                "user.login",
  USER_LOGOUT:               "user.logout",
  USER_PASSWORD_RESET:       "user.password.reset",
  ORGANIZATION_CREATED:      "organization.created",
  ORGANIZATION_UPDATED:      "organization.updated",
  STORE_CREATED:             "store.created",
  STORE_UPDATED:             "store.updated",
  STORE_STATUS_CHANGED:      "store.status.changed",
  ORDER_CREATED:             "order.created",
  ORDER_COMPLETED:           "order.completed",
  ORDER_FAILED:              "order.failed",
  ORDER_ABANDONED:           "order.abandoned",
  PAYMENT_COMPLETED:         "payment.completed",
  PAYMENT_FAILED:            "payment.failed",
  PAYMENT_REFUNDED:          "payment.refunded",
  INVENTORY_RESERVATION_FAILED: "inventory.reservation.failed",
  REVIEW_CREATED:            "review.created",
  REVIEW_APPROVED:           "review.approved",
  REVIEW_REJECTED:           "review.rejected",
  PAYOUT_REQUESTED:          "payout.requested",
  PAYOUT_APPROVED:           "payout.approved",
  PAYOUT_REJECTED:           "payout.rejected",
} as const;

export type AuditRoutingKey =
  (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export const QUEUES = {
  USER_REGISTERED:           "selleasi.audit.user.registered.queue",
  USER_LOGIN:                "selleasi.audit.user.login.queue",
  USER_LOGOUT:               "selleasi.audit.user.logout.queue",
  USER_PASSWORD_RESET:       "selleasi.audit.user.password.reset.queue",
  ORGANIZATION_CREATED:      "selleasi.audit.organization.created.queue",
  ORGANIZATION_UPDATED:      "selleasi.audit.organization.updated.queue",
  STORE_CREATED:             "selleasi.audit.store.created.queue",
  STORE_UPDATED:             "selleasi.audit.store.updated.queue",
  STORE_STATUS_CHANGED:      "selleasi.audit.store.status.changed.queue",
  ORDER_CREATED:             "selleasi.audit.order.created.queue",
  ORDER_COMPLETED:           "selleasi.audit.order.completed.queue",
  ORDER_FAILED:              "selleasi.audit.order.failed.queue",
  ORDER_ABANDONED:           "selleasi.audit.order.abandoned.queue",
  PAYMENT_COMPLETED:         "selleasi.audit.payment.completed.queue",
  PAYMENT_FAILED:            "selleasi.audit.payment.failed.queue",
  PAYMENT_REFUNDED:          "selleasi.audit.payment.refunded.queue",
  INVENTORY_RESERVATION_FAILED: "selleasi.audit.inventory.reservation.failed.queue",
  REVIEW_CREATED:            "selleasi.audit.review.created.queue",
  REVIEW_APPROVED:           "selleasi.audit.review.approved.queue",
  REVIEW_REJECTED:           "selleasi.audit.review.rejected.queue",
  PAYOUT_REQUESTED:          "selleasi.audit.payout.requested.queue",
  PAYOUT_APPROVED:           "selleasi.audit.payout.approved.queue",
  PAYOUT_REJECTED:           "selleasi.audit.payout.rejected.queue",
} as const;