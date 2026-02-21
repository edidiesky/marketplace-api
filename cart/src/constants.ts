export const UNAUTHORIZED_STATUS_CODE = 403;
export const BAD_REQUEST_STATUS_CODE = 400;
export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const UNAUTHENTICATED_STATUS_CODE = 401;
export const NOT_FOUND_STATUS_CODE = 404;
export const SERVER_ERROR_STATUS_CODE = 500;

export const BASE_EXPIRATION_SEC = 7 * 60 * 60 * 24
export const BASE_DELAY_MS = 4000;
export const EXPIRATION_SEC = 60 * 15 * 1000;
export const REDIS_EXPIRATION_MIN = 60 * 5;
export const MAX_RETRIES = 7;
export const JITTER = Math.random() * 10000;

export const CART_ITEM_ADDED_TOPIC = "cart.item.added.topic";
export const CART_ITEM_REMOVED_TOPIC = "cart.item.removed.topic";
export const CART_EXPIRED_TOPIC = "cart.expired.topic";
export const ORDER_COMPLETED_TOPIC = "order.completed.topic";

export const CART_ITEM_OUT_OF_STOCK_TOPIC = "cart.item.outOfStock.topic";



export const CART_CONSUMER_TOPICS = [
  ORDER_COMPLETED_TOPIC,
  CART_ITEM_OUT_OF_STOCK_TOPIC
];