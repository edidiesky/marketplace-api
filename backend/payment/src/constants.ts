export const SERVICE_NAME = "payment-service";
export const RABBITMQ_URL = process.env.RABBITMQ_URL!;

export const MAX_RETRIES   = 3;
export const BASE_DELAY_MS = 1_000;
export const POLL_INTERVAL_MS = 5_000;
export const TIMEOUT_MS    = 8_000;

export function getJitter(): number {
  return Math.random() * 1_000;
}

export const PLATFORM_FEE_RATE = parseFloat(
  process.env.PLATFORM_FEE_RATE ?? "0.05"
);

export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const BAD_REQUEST_STATUS_CODE          = 400;
export const UNAUTHENTICATED_STATUS_CODE      = 401;
export const UNAUTHORIZED_STATUS_CODE         = 403;
export const NOT_FOUND_STATUS_CODE            = 404;
export const CONFLICT_STATUS_CODE             = 409;
export const SERVER_ERROR_STATUS_CODE         = 500;

export const EXCHANGES = {
  PAYMENT:      "selleasi.payment",
  PAYMENT_DLX:  "selleasi.payment.dlx",
  ORDERS:       "selleasi.orders",
  NOTIFICATION: "selleasi.notification",
} as const;

export const ROUTING_KEYS = {
  PAYMENT_COMPLETED: "payment.completed",
  PAYMENT_FAILED:    "payment.failed",
  PAYMENT_INITIATED: "payment.initiated",
  PAYMENT_REFUNDED:  "payment.refunded",
  ORDER_FAILED:              "order.failed",
} as const;

export type PaymentRoutingKey =
  (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export const QUEUES = {} as const;

export const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL ?? "http://orders:4012";