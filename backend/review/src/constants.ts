export const SERVICE_NAME = "review-service";
export const RABBITMQ_URL = process.env.RABBITMQ_URL!;

export const MAX_RETRIES   = 3;
export const BASE_DELAY_MS = 1_000;

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
  REVIEW:      "selleasi.review",
  REVIEW_DLX:  "selleasi.review.dlx",
  ORDERS:      "selleasi.orders",
} as const;

export const ROUTING_KEYS = {
  REVIEW_CREATED:    "review.created",
  REVIEW_APPROVED:   "review.approved",
  ORDER_COMPLETED:   "order.completed",
} as const;

export const QUEUES = {
  ORDER_COMPLETED: "selleasi.review.order.completed.queue",
} as const;