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



// --------------------------- form Data List End --------------------

// ------------- API REQUEST ROUTE -----------------
const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export const AUTH_URL        = `${BASE_URL}/api/v1/auth`;
export const USER_URL        = `${BASE_URL}/api/v1/users`;
export const ROLE_URL        = `${BASE_URL}/api/v1/roles`;
export const STORE_URL       = `${BASE_URL}/api/v1/stores`;
export const PRODUCT_URL     = `${BASE_URL}/api/v1/products`;
export const CART_URL        = `${BASE_URL}/api/v1/carts`;
export const ORDER_URL       = `${BASE_URL}/api/v1/orders`;
export const INVENTORY_URL   = `${BASE_URL}/api/v1/inventories`;
export const PAYMENT_URL     = `${BASE_URL}/api/v1/payments`;
export const PAYOUT_URL      = `${BASE_URL}/api/v1/payouts`;
export const WALLET_URL      = `${BASE_URL}/api/v1/wallets`;
export const NOTIFICATION_URL= `${BASE_URL}/api/v1/notifications`;
export const REVIEW_URL      = `${BASE_URL}/api/v1/reviews`;
export const CATEGORY_URL    = `${BASE_URL}/api/v1/categories`;
export const COLOR_URL       = `${BASE_URL}/api/v1/colors`;
export const SIZE_URL        = `${BASE_URL}/api/v1/sizes`;
export const UPLOAD_URL      = `${BASE_URL}/api/v1/uploads`;
export const CONVERSATION_URL= `${BASE_URL}/api/v1/conversations`;