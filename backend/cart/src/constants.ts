export const SERVICE_NAME = "cart-service";
export const RABBITMQ_URL = process.env.RABBITMQ_URL!;

export const MAX_RETRIES   = 3;
export const BASE_DELAY_MS = 1_000;
export const LOCK_TTL_SEC  = 10;
export const CART_TTL_DAYS = 30;

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
  CART:         "selleasi.cart",
  CART_DLX:     "selleasi.cart.dlx",
  ORDERS:       "selleasi.orders",
  INVENTORY:    "selleasi.inventory",
  NOTIFICATION: "selleasi.notification",
} as const;

export const ROUTING_KEYS = {
  ORDER_STOCK_COMMITTED:    "order.stock.committed",
  CART_ITEM_OUT_OF_STOCK:   "cart.item.out_of_stock",
  CART_ITEM_ADDED:          "cart.item.added",
  CART_ITEM_REMOVED:        "cart.item.removed",
  CART_CLEARED:             "cart.cleared",
} as const;

export type CartRoutingKey =
  (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export const QUEUES = {
  ORDER_STOCK_COMMITTED:  "selleasi.cart.order.stock.committed.queue",
  CART_ITEM_OUT_OF_STOCK: "selleasi.cart.item.out_of_stock.queue",
} as const;