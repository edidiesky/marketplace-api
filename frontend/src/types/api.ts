export interface ApiSuccessResponse {
  success: boolean;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Auth
export interface LoginPayload { email: string; password: string; }
export interface VerifyOtpPayload { email: string; otp: string; }
export interface RegisterPayload { firstName: string; lastName: string; email: string; userType: "BUYER" | "SELLER"; }
export interface OnboardingEmailPayload { email: string; }
export interface OnboardingPasswordPayload { email: string; password: string; }
export interface RequestResetPayload { email: string; }
export interface PasswordResetPayload { token: string; password: string; }
export interface ChangePasswordPayload { currentPassword: string; newPassword: string; }
export interface AuthResponse { success: boolean; data: { accessToken: string; user: User }; }

// User
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: "BUYER" | "SELLER" | "ADMIN";
  tenantId?: string;
  tenantStatus?: "PENDING" | "ACTIVE" | "SUSPENDED";
  tenantPlan?: "free" | "basic" | "premium" | "enterprise";
  isEmailVerified: boolean;
  profileImage?: string;
  phone?: string;
  gender?: "Male" | "Female";
  createdAt: string;
}
export interface UpdateUserPayload { firstName?: string; lastName?: string; phone?: string; profileImage?: string; gender?: string; }
export interface UserListResponse { success: boolean; data: User[]; pagination: PaginationMeta; }
export interface UserQueryParams { page?: number; limit?: number; userType?: string; tenantStatus?: string; firstName?: string; lastName?: string; email?: string; }

// Store
export interface Store {
  _id: string;
  name: string;
  subdomain: string;
  ownerId: string;
  isActive: boolean;
  plan: "free" | "basic" | "premium" | "enterprise";
  description?: string;
  logo?: string;
  address?: Record<string, string>;
  createdAt: string;
}
export interface CreateStorePayload { name: string; subdomain: string; description?: string; }
export interface UpdateStorePayload { name?: string; description?: string; logo?: string; address?: Record<string, string>; }
export interface StoreListResponse { success: boolean; data: Store[]; pagination: PaginationMeta; }

// Product
export interface ProductColorOrSize {
  name: string;
  value: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string[];
  colors: ProductColorOrSize[];
  size: ProductColorOrSize[];
  store: string;
  isDeleted: boolean;
  isArchive: boolean;
  availableStock?: number;
  thresholdStock?: number;
  createdAt: string;
}
export interface CreateProductPayload { name: string; description: string; price: number; images: string[]; category: string[]; }
export interface UpdateProductPayload { name?: string; description?: string; price?: number; images?: string[]; category?: string[]; }
export interface ProductListResponse { success: boolean; data: Product[]; total: number; page: number; }
export interface SearchProductsParams { q?: string; storeId?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number; }
export interface AutocompleteResult { success: boolean; data: { name: string; _id: string }[]; }

// Cart
export interface CartItem { productId: string; productTitle: string; price: number; quantity: number; images: string[]; availabilityStatus: "available" | "unavailable"; unavailabilityReason?: string; }
export interface Cart { _id: string; userId: string; storeId: string; items: CartItem[]; totalPrice: number; quantity: number; expireAt: string; version: number; }
export interface AddToCartPayload { items: { productId: string; quantity: number }[]; }
export interface UpdateCartItemPayload { productId: string; quantity: number; }

// Order
export type OrderStatus = "payment_pending" | "payment_initiated" | "completed" | "failed" | "out_of_stock";
export type FulfillmentStatus = "unfulfilled" | "preparing" | "dispatched" | "delivered" | "delivery_failed";
export interface Order {
  _id: string;
  userId: string;
  storeId: string;
  cartId: string;
  items: CartItem[];
  totalAmount: number;
  orderStatus: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  courierName?: string;
  receiptUrl?: string;
  createdAt: string;
}
export interface ShippingAddress { street: string; city: string; state: string; country: string; postalCode?: string; }
export interface CheckoutPayload { cartId: string; requestId: string; }
export interface ShippingPayload { shippingAddress: ShippingAddress; }
export interface FulfillmentPayload { status: FulfillmentStatus; trackingNumber?: string; courierName?: string; }
export interface PaginatedOrders { success: boolean; data: Order[]; pagination: PaginationMeta; }

// Inventory
export interface Inventory { _id: string; productId: string; storeId: string; quantityOnHand: number; quantityAvailable: number; quantityReserved: number; reorderPoint?: number; reorderQuantity?: number; warehouseName?: string; }
export interface CreateInventoryPayload { productId: string; quantityOnHand: number; reorderPoint?: number; }
export interface InventoryListResponse { success: boolean; data: Inventory[]; pagination: PaginationMeta; }
export interface InventoryAvailabilityResponse { success: boolean; data: { quantityAvailable: number; isInStock: boolean }; }

// Payment
export interface Payment { _id: string; orderId: string; userId: string; amount: number; status: "pending" | "success" | "failed" | "refunded"; gateway: "paystack" | "flutterwave"; redirectUrl?: string; createdAt: string; }
export interface InitializePaymentPayload { orderId: string; gateway: "paystack" | "flutterwave"; }
export interface RefundPayload { amount?: number; reason?: string; }
export interface PaymentHistoryResponse { success: boolean; data: { payments: Payment[]; totalCount: number; totalPages: number }; }

// Payout + Wallet
export interface Payout { _id: string; sellerId: string; amount: number; status: "pending" | "approved" | "rejected"; createdAt: string; }
export interface PayoutRequestPayload { amount: number; bankCode: string; accountNumber: string; }
export interface Wallet { _id: string; sellerId: string; balance: number; currency: string; ledgerBalance: number; }

// Notification
export interface Notification { _id: string; userId: string; type: "order" | "payment" | "delivery" | "system"; message: string; isRead: boolean; createdAt: string; }
export interface NotificationListResponse { success: boolean; data: { notifications: Notification[]; totalCount: number; unreadCount: number }; }

// Review
export interface Review { _id: string; productId: string; userId: string; rating: number; comment: string; isApproved: boolean; sellerResponse?: string; helpfulCount: number; createdAt: string; }
export interface CreateReviewPayload { productId: string; rating: number; comment: string; }
export interface RespondToReviewPayload { response: string; }
export interface ReviewListResponse { success: boolean; data: Review[]; }