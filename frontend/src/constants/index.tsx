import {
  ProfilePasswordDataItem,
  RegisterFormDataItem,
  LoginFormDataItem,
  ProfileFormDataItem,
} from "./types";



export const ProfileFormData: ProfileFormDataItem[] = [
  {
    id: 4,
    name: "name",
    type: "text",
    text: "Change your Name",
    label: "Alfred Dow",
    required: true,
  },
  {
    id: 43,
    name: "username",
    type: "text",
    text: "Change your preferred Name",
    label: "JohnDoe123",
    required: true,
  },
  {
    id: 1,
    name: "email",
    type: "email",
    text: "Change your Email",
    label: "hello@example.com",
    required: true,
  },
];
export const LoginFormData: LoginFormDataItem[] = [
  {
    id: 1,
    name: "email",
    type: "email",
    text: "Email",
    label: "hello@example.com",
    required: true,
  },
  {
    id: 4,
    name: "password",
    type: "password",
    text: "Password",
    label: "my password",
    required: true,
  },
];
export const RegisterFormData: RegisterFormDataItem[] = [

  {
    id: 1,
    name: "email",
    type: "email",
    text: "Email",
    label: "hello@example.com",
    required: true,
  },
];
export const PasswordFormData: ProfilePasswordDataItem[] = [
  {
    id: 4,
    name: "password",
    type: "password",
    text: "Change your Password",
    label: "my password",
    required: true,
  },
  {
    id: 43,
    name: "confirmpassword",
    type: "password",
    text: "Change your preferred Password",
    label: "Confirm your password",
    required: true,
  },
];

// API REQUEST ROUTE
const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
 
// auth service (port 4001)
export const AUTH_URL         = `${BASE_URL}/auth/api/v1/auth`;
 
// users service (port 4016)
export const USER_URL         = `${BASE_URL}/users/api/v1/users`;
 
// stores service (port 4007)
export const STORE_URL        = `${BASE_URL}/stores/api/v1/stores`;
 
// products service (port 4003)
export const PRODUCT_URL      = `${BASE_URL}/products/api/v1/products`;
 
// cart service (port 4009) — gateway key is "cart" not "carts"
export const CART_URL         = `${BASE_URL}/cart/api/v1/carts`;
 
// orders service (port 4012)
export const ORDER_URL        = `${BASE_URL}/orders/api/v1/orders`;
 
export const INVENTORY_URL    = `${BASE_URL}/inventory/api/v1/inventories`;
 
export const PAYMENT_URL      = `${BASE_URL}/payment/api/v1/payments`;
export const PAYOUT_URL       = `${BASE_URL}/payment/api/v1/payouts`;
export const WALLET_URL       = `${BASE_URL}/payment/api/v1/wallets`;
 
// notification service (port 4006)
export const NOTIFICATION_URL = `${BASE_URL}/notification/api/v1/notifications`;
 
// review service (port 4011)
export const REVIEW_URL       = `${BASE_URL}/review/api/v1/reviews`;
 
// categories service (port 4005) — gateway key is "categories"
export const CATEGORY_URL     = `${BASE_URL}/categories/api/v1/categories`;