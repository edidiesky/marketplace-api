export const SERVICE_NAME = "orders-service";
export const RABBITMQ_URL = process.env.RABBITMQ_URL!;

export const MAX_RETRIES   = 3;
export const BASE_DELAY_MS = 1_000;
export const TIMEOUT_MS    = 8_000;

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
  ORDERS:       "selleasi.orders",
  ORDERS_DLX:   "selleasi.orders.dlx",
  PAYMENT:      "selleasi.payment",
  INVENTORY:    "selleasi.inventory",
  NOTIFICATION: "selleasi.notification",
  CART:         "selleasi.cart",
} as const;



export const ROUTING_KEYS = {
  ORDER_CREATED:             "order.created",
  ORDER_COMPLETED:           "order.completed",
  ORDER_FAILED:              "order.failed",
  ORDER_CANCELLED:           "order.cancelled",
  ORDER_ABANDONED:           "order.abandoned",
  ORDER_STOCK_COMMITTED:     "order.stock.committed",
  PAYMENT_COMPLETED:         "payment.completed",
  PAYMENT_FAILED:            "payment.failed",
  PAYMENT_INITIATED:         "payment.initiated",
  INVENTORY_RESERVATION_FAILED: "inventory.reservation.failed",
  CART_ITEM_OUT_OF_STOCK:    "cart.item.out_of_stock",
  ORDER_PAYMENT_CONFIRMED: "order.payment.confirmed",
  ORDER_STOCK_COMMIT_FAILED_TOPIC: "inventory.stock.committed.failed.topic",
  INVENTORY_STOCK_COMMITTED_TOPIC: "inventory.stock.committed.topic",
  CART_CLEAR_FAILED: "cart.clear.failed",
} as const;

export type OrderRoutingKey =
  (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export const QUEUES = {
  PAYMENT_COMPLETED:            "selleasi.orders.payment.completed.queue",
  PAYMENT_FAILED:               "selleasi.orders.payment.failed.queue",
  PAYMENT_INITIATED:            "selleasi.orders.payment.initiated.queue",
  INVENTORY_RESERVATION_FAILED: "selleasi.orders.inventory.reservation.failed.queue",
  ORDER_STOCK_COMMIT_FAILED_TOPIC: "selleasi.order.stock.committed.failed.queue",

  // NEW
  INVENTORY_STOCK_COMMITTED_TOPIC: "selleasi.orders.inventory.stock.committed.queue",
  CART_CLEAR_FAILED:                "selleasi.orders.cart.clear.failed.queue",
} as const;
export const CART_SERVICE_URL      = process.env.CART_SERVICE_URL      ?? "http://cart:4009";
export const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL ?? "http://inventory:4008";
