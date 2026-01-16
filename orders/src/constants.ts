export const UNAUTHORIZED_STATUS_CODE = 403;
export const BAD_REQUEST_STATUS_CODE = 400;
export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const UNAUTHENTICATED_STATUS_CODE = 401;
export const NOT_FOUND_STATUS_CODE = 404;
export const SERVER_ERROR_STATUS_CODE = 500;

export const BASE_DELAY_MS = 4000;
export const BASE_EXPIRATION_SEC = 60 * 60 * 2;
export const EXPIRATION_SEC = 60 * 15 * 1000;
export const REDIS_EXPIRATION_MIN = 60 * 5;
export const MAX_RETRIES = 7;
export const JITTER = Math.random() * 10000;

export const CART_ITEM_ADDED_TOPIC = "cart.item.added.topic";
export const CART_ITEM_REMOVED_TOPIC = "cart.item.removed.topic";
export const CART_EXPIRED_TOPIC = "cart.expired.topic";

export const ORDER_CHECKOUT_STARTED_TOPIC = "order.checkout.started.topic";
export const ORDER_PAYMENT_COMPLETED_TOPIC = "order.payment.completed.topic";
export const ORDER_PAYMENT_FAILED_TOPIC = "order.payment.failed.topic";
export const ORDER_COMPLETED_TOPIC = "order.completed.topic";
export const ORDER_RESERVATION_FAILED_TOPIC = "order.reservation.failed.topic";


export const INVENTORY_RESERVATION_REQUEST_TOPIC = "inventory.reservation.request.topic"; 
export const INVENTORY_RESERVATION_COMPLETED_TOPIC = "inventory.reservation.completed.topic";
export const INVENTORY_STOCK_COMMITTED_TOPIC = "inventory.stock.committed.topic";
export const INVENTORY_RELEASE_REQUEST_TOPIC = "inventory.release.request.topic";
export const CART_ITEM_OUT_OF_STOCK_TOPIC = "cart.item.outOfStock.topic";

export const ORDER_CONSUMER_TOPICS = [
  ORDER_PAYMENT_COMPLETED_TOPIC,
  ORDER_PAYMENT_FAILED_TOPIC,
  INVENTORY_RESERVATION_COMPLETED_TOPIC, 
  ORDER_RESERVATION_FAILED_TOPIC
];