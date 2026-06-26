//  Shared 
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

//  Auth 
export interface LoginPayload { email: string; password: string; }
export interface VerifyOtpPayload { email: string; otp: string; }
export interface RequestResetPayload { email: string; }

// Backend field is `newPassword` — the service layer maps `password` -> `newPassword`
export interface PasswordResetPayload { token: string; password: string; }

// Backend changePasswordSchema requires email + newPassword
// The service layer maps currentPassword out and sends email from auth state
export interface ChangePasswordPayload { currentPassword: string; newPassword: string; email: string; }

export interface AuthResponse {
  success:      boolean;
  accessToken:  string;
  refreshToken: string;
  user: {
    userId:           string;
    userType:         string;
    organizationId:   string;
    organizationType: string;
    name:             string;
    roles:            string[];
  };
}

//  User
export interface User {
  userId:           string;
  userType:
    | "seller:admin"
    | "seller:member"
    | "seller:viewer"
    | "customer"
    | "platform:admin"
    | "platform:staff"
    | "investor"
    | "advisor"
    | "system";
  organizationId:   string;
  organizationType: string;
  name:             string;
  roles:            string[];
  email?:           string;
  firstName?:       string;
  lastName?:        string;
  isEmailVerified?: boolean;
  profileImage?:    string;
  phone?:           string;
  gender?:          "Male" | "Female";
  createdAt?:       string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImage?: string;
  gender?: string;
}

export interface UserListResponse {
  success: boolean;
  data: User[];
  pagination: PaginationMeta;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  userType?: string;
  tenantStatus?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

//  Store 
export interface Store {
  _id?: string;
  storeId?: string;
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

export interface CreateStorePayload { name: string; subdomain: string; description?: string; email?: string; address?: string; }
export interface UpdateStorePayload { name?: string; description?: string; logo?: string; address?: Record<string, string>; }
export interface StoreListResponse { success: boolean; data: Store[]; pagination: PaginationMeta; }
export interface MyStoreResponse {
  success:    boolean;
  data: {
    stores:     Store[];
    totalCount: number;
    totalPages: number;
    page:       number;
    limit:      number;
  };
}

//  Product 
export interface ProductColorOrSize { name: string; value: string; }

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

export interface CreateProductPayload {
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string[];
  colors?: ProductColorOrSize[];
  size?: ProductColorOrSize[];
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  price?: number;
  images?: string[];
  category?: string[];
  colors?: ProductColorOrSize[];
  size?: ProductColorOrSize[];
  isArchive?: boolean;
}

export interface ProductListResponse {
  success:    boolean;
  data: {
    products:   Product[];
    totalCount: number;
    totalPages: number;
    page:       number;
    limit:      number;
  };
}
export interface SearchProductsParams { q?: string; storeId?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number; }
export interface AutocompleteResult { success: boolean; data: { name: string; _id: string }[]; }

//  Cart 
export interface CartItem {
  productId: string;
  productTitle: string;
  price: number;
  quantity: number;
  images: string[];
  availabilityStatus: "available" | "unavailable";
  unavailabilityReason?: string;
}

export interface Cart {
  _id: string;
  userId: string;
  storeId: string;
  items: CartItem[];
  totalPrice: number;
  quantity: number;
  expireAt: string;
  version: number;
}

//  Order 
export type OrderStatus =
  | "payment_pending"
  | "payment_initiated"
  | "completed"
  | "failed"
  | "out_of_stock";

// Full enum from order.model.ts
export type FulfillmentStatus =
  | "unfulfilled"
  | "preparing"
  | "dispatched"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "returned";

// Backend shipping is flat fields — NOT nested shippingAddress object
export interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  postalCode?: string;
}

export interface Order {
  _id: string;
  userId: string;
  storeId: string;
  cartId: string;
  items: CartItem[];
  totalAmount: number;
  orderStatus: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  shipping?: ShippingAddress;
  trackingNumber?: string;
  courierName?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface PaginatedOrders {
  success: boolean;
  data: {
    orders:     Order[];
    totalCount: number;
    totalPages: number;
    page:       number;
    limit:      number;
  };
}

//  Inventory 
export interface Inventory {
  _id: string;
  productId: string;
  storeId: string;
  quantityOnHand: number;
  quantityAvailable: number;
  quantityReserved: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  warehouseName?: string;
}

export interface CreateInventoryPayload { productId: string; quantityOnHand: number; reorderPoint?: number; }
export interface InventoryListResponse { success: boolean; data: Inventory[]; pagination: PaginationMeta; }
export interface InventoryAvailabilityResponse { success: boolean; data: { quantityAvailable: number; isInStock: boolean }; }

//  Payment 
export interface Payment {
  _id: string;
  orderId: string;
  userId: string;
  amount: number;
  status: "pending" | "success" | "failed" | "refunded";
  gateway: "paystack" | "flutterwave";
  redirectUrl?: string;
  createdAt: string;
}

export interface InitializePaymentPayload { orderId: string; gateway: "paystack" | "flutterwave"; }
export interface RefundPayload { amount?: number; reason?: string; }
export interface PaymentHistoryResponse {
  success: boolean;
  data: { payments: Payment[]; totalCount: number; totalPages: number };
}

//  Payout 
export interface Payout {
  _id: string;
  sellerId: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}
export interface PayoutRequestPayload { amount: number; bankCode: string; accountNumber: string; }

//  Wallet 
export interface Wallet {
  _id: string;
  sellerId: string;
  balance: number;
  currency: string;
  ledgerBalance: number;
}

//  Notification 
export interface Notification {
  _id: string;
  userId: string;
  type: "order" | "payment" | "delivery" | "system";
  message: string;
  isRead: boolean;
  createdAt: string;
}
export interface NotificationListResponse {
  success: boolean;
  data: { notifications: Notification[]; totalCount: number; unreadCount: number };
}

//  Review 
export interface Review {
  _id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  sellerResponse?: string;
  helpfulCount: number;
  createdAt: string;
}
export interface CreateReviewPayload { productId: string; rating: number; comment: string; }
export interface RespondToReviewPayload { response: string; }
export interface ReviewListResponse { success: boolean; data: Review[]; }