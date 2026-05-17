
/**
 * @description INVENTORY TOPICS
 */
export const PRODUCT_ONBOARDING_COMPLETED_TOPIC =
  "product.onboarding.completed.topic";
export const ORDER_CHECKOUT_STARTED_TOPIC = "order.checkout.started.topic";
export const ORDER_PAYMENT_COMPLETED_TOPIC = "order.payment.completed.topic";
export const ORDER_PAYMENT_FAILED_TOPIC = "order.payment.failed.topic";
export const ORDER_RESERVATION_FAILED_TOPIC = "order.reservation.failed.topic";
export const ORDER_STOCK_COMMITTED_TOPIC = "order.stock.committed.topic";

export const INVENTORY_CONSUMER_TOPICS = [
  PRODUCT_ONBOARDING_COMPLETED_TOPIC,
  ORDER_CHECKOUT_STARTED_TOPIC,
  ORDER_PAYMENT_COMPLETED_TOPIC,
  ORDER_PAYMENT_FAILED_TOPIC
];


export const SERVICE_NAME = "inventory-service";
export const RABBITMQ_URL = process.env.RABBITMQ_URL!;

export const MAX_RETRIES   = 3;
export const BASE_DELAY_MS = 1_000;

export const MVCC_MAX_RETRIES   = 8;
export const MVCC_BASE_DELAY_MS = 15;
export const RESERVATION_TTL    = 600;

export function getJitter(): number {
  return Math.random() * 1_000;
}

export function getMvccJitter(): number {
  return Math.random() * 20;
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
  INVENTORY:     "selleasi.inventory",
  INVENTORY_DLX: "selleasi.inventory.dlx",
  PRODUCTS:      "selleasi.products",
  NOTIFICATION:  "selleasi.notification",
  ORDERS:        "selleasi.orders",
} as const;

export const ROUTING_KEYS = {
  PRODUCT_CREATED:       "product.created",
  INVENTORY_LOW:         "inventory.low",
  INVENTORY_RESERVED:    "inventory.reserved",
  INVENTORY_RELEASED:    "inventory.released",
  INVENTORY_COMMITTED:   "inventory.committed",
} as const;

export type InventoryRoutingKey =
  (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export const QUEUES = {
  PRODUCT_CREATED: "selleasi.inventory.product.created.queue",
} as const;

export const LOW_STOCK_THRESHOLD_MULTIPLIER = 1;