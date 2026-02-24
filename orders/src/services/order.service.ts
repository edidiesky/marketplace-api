import { FilterQuery, Types } from "mongoose";
import Order, { IOrder, OrderStatus } from "../models/Order";
import { IOrderRepository } from "../repository/IOrderRepository";
import { OrderRepository } from "../repository/OrderRepository";
import redisClient from "../config/redis";
import logger from "../utils/logger";
import { withTransaction } from "../utils/connectDB";
import {
  SUCCESSFULLY_FETCHED_STATUS_CODE,
  ORDER_CHECKOUT_STARTED_TOPIC,
} from "../constants";
import { ICart } from "../types";
import { sendOrderMessage } from "../messaging/producer";

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
      });
    } catch (error) {
      logger.error("Order cache write failed", {
        event: "failed_to_write_cache",
        latestKey,
        versionKey,
        message:
          error instanceof Error ? error?.message : "an unknown error occurred",
        stack:
          error instanceof Error ? error?.stack : "an unknown error occurred",
      });
    }
  }

  
  async createOrderFromCart(
    userId: string,
    cart: ICart,
    sellerId: string,
    requestId: string
  ): Promise<IOrder> {
    const cartId = cart._id;
    const existingByRequestId = await this.repo.getOrderByRequestId(requestId);
    if (existingByRequestId) {
      logger.info("Order already exists for this request", {
        event: "duplicate_order_request",
        orderId: existingByRequestId._id,
        requestId,
        userId,
      });
      return existingByRequestId;
    }

    const existingByCart = await this.repo.getOrderByCartId(cartId);
    if (existingByCart) {
      logger.warn("Order already exists for this cart (different requestId)", {
        event: "existing_order_different_request",
        orderId: existingByCart._id,
        existingRequestId: existingByCart.requestId,
        newRequestId: requestId,
        cartId,
      });
      return existingByCart;
    }

    return withTransaction(async (session) => {
      const sagaId = `order-${Date.now()}-${userId}-${requestId}`;

      const orderData: Partial<IOrder> = {
        userId: new Types.ObjectId(userId),
        sellerId: new Types.ObjectId(sellerId),
        storeId: new Types.ObjectId(cart.storeId),
        cartId: new Types.ObjectId(cart._id),
        fullName: cart.fullName,
        totalPrice: cart.totalPrice,
        quantity: cart.quantity,
        cartItems: cart.cartItems.map((item: any) => ({
          ...item,
          productId: new Types.ObjectId(item.productId),
        })),
        requestId,
        orderStatus: OrderStatus.PENDING,
      };

      const order = await this.repo.createOrder(orderData, session);
      await this.addToCache(userId, order);

      logger.info("Order created successfully", {
        event: "order_successfully_created",
        orderId: order._id,
        userId: order.userId,
        cartId: cart._id,
        totalPrice: cart.totalPrice,
        requestId,
        sagaId,
      });

      try {
        await sendOrderMessage(
          ORDER_CHECKOUT_STARTED_TOPIC,
          {
            orderId: order._id.toString(),
            userId: order.userId.toString(),
            storeId: order.storeId.toString(),
            cartId: order.cartId.toString(),
            sagaId,
            items: order.cartItems.map((item) => ({
              productId: item.productId.toString(),
              productTitle: item.productTitle,
              quantity: item.productQuantity,
              price: item.productPrice,
            })),
            totalPrice: order.totalPrice,
            createdAt: new Date().toISOString(),
          },
          order.userId.toString() // Partition key
        );

        logger.info("ORDER_CHECKOUT_STARTED event published", {
          orderId: order._id,
          sagaId,
          itemCount: order.cartItems.length,
        });
      } catch (eventError) {
        logger.error("CRITICAL: Failed to publish checkout started event", {
          orderId: order._id,
          sagaId,
          error: eventError instanceof Error ? eventError.message : String(eventError),
        });

        await this.repo.updateOrderStatus(
          order._id.toString(),
          OrderStatus.FAILED,
          {
            failureReason: "Failed to initiate checkout process",
          }
        );

        throw new Error(
          "Order created but failed to start checkout process. Please contact support."
        );
      }

      return order;
    });
  }

  async getOrderById(orderId: string): Promise<IOrder | null> {
    return this.repo.getOrderById(orderId);
  }

  async getUserOrders(
    query: FilterQuery<IOrder>,
    skip: number,
    limit: number
  ) {
    const [orders, totalCount] = await Promise.all([
      this.repo.getUserOrders(query, skip, limit),
      Order.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalCount / limit);

    logger.info("User orders fetched successfully", {
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
      logger.info("Order completed successfully", { orderId });
    }

    return order;
  }

  async markPaymentFailed(orderId: string, reason?: string) {
    const order = await this.repo.updateOrderStatus(
      orderId,
      OrderStatus.FAILED,
      {
        failureReason: reason || "Payment failed",
      }
    );

    if (order) {
      await this.addToCache(order.userId.toString(), order);
      logger.info("Order marked as payment failed", { orderId, reason });
    }

    return order;
  }

  async updateOrderToOutOfStock(
    orderId: string,
    status: OrderStatus = OrderStatus.OUT_OF_STOCK,
    updates: Partial<IOrder> = {}
  ): Promise<IOrder | null> {
    const updated = await this.repo.updateOrderStatus(orderId, status, updates);

    if (updated) {
      await this.addToCache(updated.userId.toString(), updated);
      logger.info("Order marked as out of stock due to reservation issue", {
        orderId,
        newStatus: status,
        failureReason: updates.failureReason,
      });
    }

    return updated;
  }
}

export const orderService = new OrderService();