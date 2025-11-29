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



/**
 * @description PRODUCT TOPICS
 */
export const PRODUCT_ONBOARDING_COMPLETED_TOPIC =
  "product.onboarding.completed.topic";
  
export const INVENTORY_CONSUMER_TOPICS = [
  PRODUCT_ONBOARDING_COMPLETED_TOPIC,
];
