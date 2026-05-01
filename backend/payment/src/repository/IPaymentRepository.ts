import mongoose, { FilterQuery } from "mongoose";
import { IPayment } from "../models/Payment";

export interface IPaymentRepository {
  getUserPayments: (
    query: FilterQuery<IPayment>,
    skip: number,
    limit: number
  ) => Promise<IPayment[] | null>;
  getPaymentStats: (
    storeId: string,
    startDate: Date,
    endDate: Date
  ) => Promise<{
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    pendingPayments: number;
  }>;
  createPayment(
    data: Partial<IPayment>,
    session: mongoose.ClientSession
  ): Promise<IPayment>;
  getPaymentByOrderId(
    orderId: string,
    session: mongoose.ClientSession | null
  ): Promise<IPayment | null>;
  getPaymentById(id: string): Promise<IPayment | null>;
  getPaymentByPaymentId(paymentId: string): Promise<IPayment | null>;
  getPaymentBySagaId(sagaId: string): Promise<IPayment | null>;
  updatePaymentStatus(
    paymentId: string,
    status: string,
    updates?: Partial<IPayment>
  ): Promise<IPayment | null>;
}


