import { CartItemStatus } from "./cart.model";

export interface AddToCartDto {
  userId:              string;
  storeId:             string;
  sellerId:            string;
  productId:           string;
  productTitle:        string;
  productImage:        string[];
  productPrice:        number;
  productDescription?: string;
  quantity:            number;
  fullName:            string;
  email?:              string;
  idempotencyKey?:     string;
}

export interface UpdateCartItemDto {
  userId:    string;
  storeId:   string;
  productId: string;
  quantity:  number;
}

export interface DeleteCartItemDto {
  userId:    string;
  storeId:   string;
  productId: string;
}

export interface CartItemResponseDto {
  productId:            string;
  productTitle:         string;
  productDescription:   string;
  productPrice:         number;
  productQuantity:      number;
  productImage:         string[];
  reservedAt?:          Date;
  availabilityStatus:   CartItemStatus;
  unavailabilityReason?: string;
}

export interface CartResponseDto {
  cartId:     string;
  userId:     string;
  sellerId:   string;
  storeId:    string;
  fullName:   string;
  email?:     string;
  quantity:   number;
  totalPrice: number;
  cartItems:  CartItemResponseDto[];
  expireAt:   Date;
  version:    number;
  createdAt:  Date;
  updatedAt:  Date;
}

export interface CartListResponseDto {
  carts:      CartResponseDto[];
  totalCount: number;
  totalPages: number;
  page:       number;
  limit:      number;
}

export interface MarkItemsUnavailableDto {
  cartId:           string;
  unavailableItems: Array<{
    productId: string;
    reason:    string;
  }>;
}

export interface ClearCartDto {
  storeId: string;
}

export interface CartConflictError {
  success: false;
  message: string;
  code:    "CART_LOCK_CONFLICT";
}