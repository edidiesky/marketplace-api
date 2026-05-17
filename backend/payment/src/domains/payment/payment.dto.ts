import { PaymentGateway, PaymentMethod, PaymentStatus } from "./payment.model";

export interface InitializePaymentDto {
  orderId:       string;
  gateway:       PaymentGateway;
  customerEmail: string;
  customerName:  string;
  customerId:    string;
  phone?:        string;
  currency?:     string;
}

export interface InitializePaymentResponseDto {
  paymentId:   string;
  redirectUrl: string;
}

export interface PaymentResponseDto {
  paymentId:     string;
  orderId:       string;
  customerId:    string;
  storeId:       string;
  amount:        number;
  currency:      string;
  status:        PaymentStatus;
  gateway:       PaymentGateway;
  method:        PaymentMethod;
  customerEmail: string;
  customerName:  string;
  sagaId:        string;
  paidAt?:       Date;
  failedAt?:     Date;
  refundedAt?:   Date;
  createdAt:     Date;
  updatedAt:     Date;
}

export interface PaymentListResponseDto {
  payments:   PaymentResponseDto[];
  totalCount: number;
  totalPages: number;
  page:       number;
  limit:      number;
}

export interface PaymentStatsDto {
  totalAmount:        number;
  successfulPayments: number;
  failedPayments:     number;
  pendingPayments:    number;
}

export interface OrderSnapshotDto {
  _id:         string;
  userId:      string;
  storeId:     string;
  sellerId:    string;
  totalPrice:  number;
  orderStatus: string;
  sagaId:      string;
}