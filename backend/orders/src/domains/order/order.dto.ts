import {
  FulfillmentStatus,
  ICartItem,
  IShippingAddress,
  OrderStatus,
  PaymentChannel,
} from "./order.model";

export interface CheckoutDto {
  userId:    string;
  storeId:   string;
  cartId:    string;
  requestId: string;
}

export interface AddShippingDto {
  userId:   string;
  orderId:  string;
  shipping: IShippingAddress;
}

export interface UpdateFulfillmentDto {
  sellerId:       string;
  orderId:        string;
  status:         FulfillmentStatus;
  trackingNumber?: string;
  courierName?:   string;
}

export interface CartSnapshotDto {
  _id:        string;
  userId:     string;
  storeId:    string;
  sellerId:   string;
  fullName:   string;
  quantity:   number;
  totalPrice: number;
  cartItems: Array<{
    productId:          string;
    productTitle:       string;
    productDescription?: string;
    productPrice:       number;
    productQuantity:    number;
    productImage:       string[];
  }>;
}

export interface OrderResponseDto {
  orderId:           string;
  userId:            string;
  sellerId:          string;
  storeId:           string;
  cartId:            string;
  fullName:          string;
  quantity:          number;
  totalPrice:        number;
  cartItems:         ICartItem[];
  orderStatus:       OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentChannel?:   PaymentChannel;
  transactionId?:    string;
  failureReason?:    string;
  paymentDate?:      Date;
  requestId:         string;
  sagaId:            string;
  shipping?:         IShippingAddress;
  trackingNumber?:   string;
  courierName?:      string;
  receiptUrl?:       string;
  createdAt:         Date;
  updatedAt:         Date;
}

export interface OrderListResponseDto {
  orders:     OrderResponseDto[];
  totalCount: number;
  totalPages: number;
  page:       number;
  limit:      number;
}

export interface FailedItem {
  productId:    string;
  productTitle: string;
  reason:       string;
}