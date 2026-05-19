export const UNAUTHORIZED_STATUS_CODE    = 403;
export const BAD_REQUEST_STATUS_CODE     = 400;
export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const UNAUTHENTICATED_STATUS_CODE = 401;
export const NOT_FOUND_STATUS_CODE       = 404;
export const SERVER_ERROR_STATUS_CODE    = 500;

export const SERVICE_NAME = "api-gateway";

export interface Services {
  auth:         string;
  audit:        string;
  cart:         string;
  categories:   string;
  color:        string;
  escrow:       string;
  inventory:    string;
  notification: string;
  orders:       string;
  organization: string;
  payment:      string;
  products:     string;
  review:       string;
  size:         string;
  stores:       string;
  subscription: string;
  users:        string;
  view:         string;
}

export const services: Services = {
  auth:         process.env.AUTH_SERVICE_URL         ?? "http://authentication:4001",
  audit:        process.env.AUDIT_SERVICE_URL        ?? "http://audit:4002",
  products:     process.env.PRODUCTS_SERVICE_URL     ?? "http://products:4003",
  payment:      process.env.PAYMENT_SERVICE_URL      ?? "http://payment:4004",
  categories:   process.env.CATEGORIES_SERVICE_URL   ?? "http://categories:4005",
  notification: process.env.NOTIFICATION_SERVICE_URL ?? "http://notification:4006",
  stores:       process.env.STORES_SERVICE_URL       ?? "http://stores:4007",
  inventory:    process.env.INVENTORY_SERVICE_URL    ?? "http://inventory:4008",
  cart:         process.env.CART_SERVICE_URL         ?? "http://cart:4009",
  organization: process.env.ORGANIZATION_SERVICE_URL ?? "http://organization:4010",
  review:       process.env.REVIEW_SERVICE_URL       ?? "http://review:4011",
  orders:       process.env.ORDERS_SERVICE_URL       ?? "http://orders:4012",
  color:        process.env.COLOR_SERVICE_URL        ?? "http://color:4013",
  view:         process.env.VIEW_SERVICE_URL         ?? "http://view:4014",
  size:         process.env.SIZE_SERVICE_URL         ?? "http://size:4015",
  users:        process.env.USERS_SERVICE_URL        ?? "http://users:4016",
  subscription: process.env.SUBSCRIPTION_SERVICE_URL ?? "http://subscription:4017",
  escrow:       process.env.ESCROW_SERVICE_URL       ?? "http://escrow:4018",
};

export const PUBLIC_ROUTES = new Set([
  "auth",
]);

export const WEBHOOK_PATH_PREFIX = "api/v1/webhooks/";

export const WP_PROBE_PATHS = new Set([
  "wp-admin",
  "wp-includes",
  "xmlrpc.php",
  "wp-login.php",
  ".env",
  "phpinfo.php",
  "php.ini",
  "server-status",
  "admin",
  "phpmyadmin",
]);

export const FORWARDED_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-paystack-signature",
  "verif-hash",
  "x-request-id",
]);

export const BASE_DOMAIN = process.env.BASE_DOMAIN ?? "selleasi.com";

export const STORE_CONTEXT_HEADERS = [
  "x-store-id",
  "x-store-organization-id",
  "x-store-name",
] as const;