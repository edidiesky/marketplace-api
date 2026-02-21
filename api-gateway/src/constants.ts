export const UNAUTHORIZED_STATUS_CODE = 403;
export const BAD_REQUEST_STATUS_CODE = 400;
export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const UNAUTHENTICATED_STATUS_CODE = 401;
export const NOT_FOUND_STATUS_CODE = 404;
export const SERVER_ERROR_STATUS_CODE = 500;


export const services: Services = {
  auth: process.env.AUTH_SERVICE_URL || "http://auth:4001",
  products: process.env.PRODUCT_SERVICE_URL || "http://products:4003",
  audit: process.env.AUDIT_SERVICE_URL || "http://audit:4002",
  payment: process.env.PAYMENT_SERVICE_URL || "http://payment:4004",
  categories: process.env.CATEGORIES_SERVICE_URL || "http://categories:4005",
  notification:
    process.env.NOTIFICATION_SERVICE_URL || "http://notification:4006",
  stores: process.env.STORES_SERVICE_URL || "http://stores:4007",
  inventory: process.env.INVENTORY_SERVICE_URL || "http://inventory:4008",
  cart: process.env.CART_SERVICE_URL || "http://cart:4009",
  tenant: process.env.TENANT_SERVICE_URL || "http://tenant:4010",
  review: process.env.REVIEW_SERVICE_URL || "http://review:4011",
  orders: process.env.ORDERS_SERVICE_URL || "http://orders:4012",
  color: process.env.COLOR_SERVICE_URL || "http://color:4013",
  view: process.env.VIEW_SERVICE_URL || "http://view:4014",
  size: process.env.VIEW_SERVICE_URL || "http://size:4015",
};

/**
 * @description Interfacing description for each services
 */
export interface Services {
  auth: string;
  audit: string;
  cart: string;
  categories: string;
  inventory: string;
  payment: string;
  products: string;
  notification: string;
  tenant: string;
  stores: string;
  review: string;
  orders: string;
  color: string;
  view: string;
  size:string;
}
