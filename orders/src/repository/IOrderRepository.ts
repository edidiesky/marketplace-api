import mongoose, { FilterQuery } from "mongoose";
import { IOrder } from "../models/Order";

export interface IOrderRepository {
  createOrder: (
    data: Partial<IOrder>,
    session: mongoose.ClientSession
  ) => Promise<IOrder>;
  
  // OrderExists
  getUserOrders: (
    query: FilterQuery<IOrder>,
    skip: number,
    limit: number
  ) => Promise<IOrder[] | null>;
  getOrderById: (OrderId: string) => Promise<IOrder | null>;
  getOrderByRequestId: (requestId: string) => Promise<IOrder | null>;
  updateOrderStatus: (
    orderId: string,
    status: string,
    updates?: Partial<IOrder>
  ) => Promise<IOrder | null>;
  //   deleteOrder: (data: string) => Promise<void>;
}
