import mongoose, { FilterQuery } from "mongoose";
import { IOrder, OrderStatus } from "../models/Order";

export interface IOrderRepository {
  createOrder: (
    data: Partial<IOrder>,
    session: mongoose.ClientSession,
  ) => Promise<IOrder>;
  getUserOrders: (
    query: FilterQuery<IOrder>,
    skip: number,
    limit: number,
  ) => Promise<IOrder[] | null>;
  getOrderById: (OrderId: string) => Promise<IOrder | null>;
  getOrderByRequestId: (requestId: string) => Promise<IOrder | null>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    updates?: Partial<IOrder>,
  ) => Promise<IOrder | null>;
  getOrderByCartId: (cartId: string) => Promise<IOrder | null>;
}
