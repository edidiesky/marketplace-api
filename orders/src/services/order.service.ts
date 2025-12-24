import { FilterQuery, Types } from "mongoose";
import Order, { IOrder, OrderStatus } from "../models/Order";
import { IOrderRepository } from "../repository/IOrderRepository";
import { OrderRepository } from "../repository/OrderRepository";
import redisClient from "../config/redis";
import logger from "../utils/logger";
import { withTransaction } from "../utils/connectDB";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";

export class OrderService {
  private repo: IOrderRepository;
  private readonly CACHE_PREFIX = "Order:";
  private readonly CACHE_TTL = 60;


  constructor() {
    this.repo = new OrderRepository();
  }

  private getLatestVersionKey(userId: string): string {
    return `${this.CACHE_PREFIX}${userId}:latest_version`;
  }

  private getVersionKey(userId: string, version: number): string {
    return `${this.CACHE_PREFIX}${userId}:v${version}`;
  }

  private async addToCache(userId: string, order: IOrder): Promise<void> {
    const latestKey = this.getLatestVersionKey(userId);
    const versionKey = this.getVersionKey(userId, order.version);

    try {
      await Promise.all([
        redisClient.set(
          versionKey,
          JSON.stringify(order),
          "EX",
          this.CACHE_TTL
        ),
        redisClient.set(
          latestKey,
          order.version.toString(),
          "EX",
          this.CACHE_TTL
        ),
      ]);
      logger.info("Order cache write successful", {
        event: "write_to_cache_successful",
        latestKey,
        versionKey,
        message:
          "The write to both the version and data cache were botgh succesful",
      });
    } catch (error) {
      logger.error("Order cache write failed", {
        event: "failed_to_write_cache",
        latestKey,
        versionKey,
        message:
          error instanceof Error
            ? error?.message
            : "an unknown error has occured",
        stack:
          error instanceof Error
            ? error?.stack
            : "an unknown error has occured",
      });
    }
  }

  async createOrderFromCart(
    userId: string,
    cart: any,
    requestId: string
  ): Promise<IOrder> {
    return withTransaction(async (session) => {
      const existing = await this.repo.getOrderByRequestId(requestId);
      if (existing) {
        return existing;
      }

      const orderData: Partial<IOrder> = {
        userId: new Types.ObjectId(userId),
        storeId: new Types.ObjectId(cart.storeId),
        cartId: new Types.ObjectId(cart._id),
        fullName: cart.fullName,
        totalPrice: cart.totalPrice,
        quantity: cart.quantity,
        cartItems: cart.cartItems,
        requestId,
        orderStatus: OrderStatus.PENDING,
      };

      const order = await this.repo.createOrder(orderData, session);
      await this.addToCache(userId, order);

      // logger.info("Order created - pending payment", { orderId: order._id, requestId });

      logger.info("Succesfully Created order - Order Service:", {
        event: "order_successfully_created",
        order_id: order?._id,
        user_id: order?.userId,
        cart_id: cart._id,
        totalPrice: cart.totalPrice,
      });
      return order;
    });
  }

  async getOrderById(orderId: string): Promise<IOrder | null> {
    return this.repo.getOrderById(orderId);
  }

  async getUserOrders(query: FilterQuery<IOrder>, skip: number, limit: number) {
    const [orders, totalCount] = await Promise.all([
      this.repo.getUserOrders(query, skip, limit),
      Order.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalCount / limit);

    logger.info("User orders has been fetched succesfully:", {
      event: "user_order_successfully_fetched",
      orderLength: orders?.length,
      query,
      limit,
    });
    return {
      data: {
        orders,
        totalCount,
        totalPages,
      },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  async confirmPaymentSuccess(
    orderId: string,
    transactionId: string,
    paymentDate: Date
  ) {
    const order = await this.repo.updateOrderStatus(
      orderId,
      OrderStatus.COMPLETED,
      {
        transactionId,
        paymentDate,
      }
    );

    if (order) {
      await this.addToCache(order.userId.toString(), order);
      // TODO: Emit order.completed → clear cart, generate invoice, send email
      logger.info("Order completed successfully", { orderId });
    }

    return order;
  }

  async markPaymentFailed(orderId: string) {
    const order = await this.repo.updateOrderStatus(
      orderId,
      OrderStatus.FAILED
    );
    if (order) {
      await this.addToCache(order.userId.toString(), order);
      // TODO: Emit order.payment.failed → release inventory
    }
    return order;
  }
}

export const orderService = new OrderService();
