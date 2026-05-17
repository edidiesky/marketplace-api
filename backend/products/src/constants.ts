export const SERVICE_NAME = "products-service";
export const RABBITMQ_URL = process.env.RABBITMQ_URL!;

export const MAX_RETRIES   = 3;
export const BASE_DELAY_MS = 1_000;

export function getJitter(): number {
  return Math.random() * 1_000;
}

export const POLL_INTERVAL_MS = 5_000;

export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const BAD_REQUEST_STATUS_CODE          = 400;
export const UNAUTHENTICATED_STATUS_CODE      = 401;
export const UNAUTHORIZED_STATUS_CODE         = 403;
export const NOT_FOUND_STATUS_CODE            = 404;
export const CONFLICT_STATUS_CODE             = 409;
export const SERVER_ERROR_STATUS_CODE         = 500;

export const EXCHANGES = {
  PRODUCTS:     "selleasi.products",
  PRODUCTS_DLX: "selleasi.products.dlx",
  NOTIFICATION: "selleasi.notification",
  INVENTORY:    "selleasi.inventory",
} as const;

export const ROUTING_KEYS = {
  PRODUCT_CREATED: "product.created",
  PRODUCT_UPDATED: "product.updated",
  PRODUCT_DELETED: "product.deleted",
} as const;

export type ProductRoutingKey =
  (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export const QUEUES = {} as const;

export const PRODUCT_INDEX = "products";