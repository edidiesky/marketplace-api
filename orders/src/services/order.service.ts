import { FilterQuery, Types } from "mongoose";
import Order, {
  FulfillmentStatus,
  IOrder,
  OrderStatus,
  ShippingAddress,
} from "../models/Order";
import { IOrderRepository } from "../repository/IOrderRepository";
import { OrderRepository } from "../repository/OrderRepository";
import { withTransaction } from "../utils/connectDB";
import redisClient from "../config/redis";
import logger from "../utils/logger";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
import { fulfillmentTransitions } from "../utils/fulfillmentTransitions";
import { generateReceiptBuffer } from "../utils/generateReceipt";
import { uploadToCloudinary } from "../utils/cloudinary";
import { AppError } from "../utils/AppError";

const CART_SERVICE_URL = process.env.CART_SERVICE_URL ?? "http://cart:4009";
const INVENTORY_SERVICE_URL =
  process.env.INVENTORY_SERVICE_URL ?? "http://inventory:4008";
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET ?? "";
const TIMEOUT_MS = 8000;

interface CartSnapshot {
  _id: string;
  userId: string;
  storeId: string;
  sellerId: string;
  fullName: string;
  quantity: number;
  totalPrice: number;
  cartItems: Array<{
    productId: string;
    productTitle: string;
    productDescription?: string;
    productPrice: number;
    productQuantity: number;
    productImage: string[];
  }>;
}

export class OrderService {
  private repo: IOrderRepository;
  private readonly CACHE_PREFIX = "Order:";
  private readonly CACHE_TTL = 300;

  constructor() {
    this.repo = new OrderRepository();
  }

  private getCacheKey(orderId: string): string {
    return `${this.CACHE_PREFIX}${orderId}`;
  }

  private async writeCache(orderId: string, order: IOrder): Promise<void> {
    try {
      await redisClient.set(
        this.getCacheKey(orderId),
        JSON.stringify(order),
        "EX",
        this.CACHE_TTL,
      );
    } catch (err) {
      logger.warn("Order cache write failed", { orderId });
    }
  }

  private async invalidateCache(orderId: string): Promise<void> {
    try {
      await redisClient.del(this.getCacheKey(orderId));
    } catch (err) {
      logger.warn("Order cache invalidation failed", { orderId });
    }
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private internalHeaders() {
    return {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_SECRET,
    };
  }

  private async fetchCart(cartId: string): Promise<CartSnapshot> {
    let res: Response;
    try {
      res = await this.fetchWithTimeout(
        `${CART_SERVICE_URL}/api/v1/carts/internal/${cartId}`,
        { method: "GET", headers: this.internalHeaders() },
      );
    } catch (err) {
      logger.error("Cart service unreachable", { cartId, err });
      throw AppError.serviceUnavailable("Cart service is currently unavailable");
    }

    if (res.status === 404) {
      throw AppError.notFound(`Cart ${cartId} not found`);
    }

    if (!res.ok) {
      throw AppError.badRequest(`CART_FETCH_FAILED:${res.status}`);
    }

    return res.json() as Promise<CartSnapshot>;
  }

  private async reserveItem(
    storeId: string,
    productId: string,
    quantity: number,
    sagaId: string,
    userId: string,
  ): Promise<void> {
    let res: Response;
    try {
      res = await this.fetchWithTimeout(
        `${INVENTORY_SERVICE_URL}/api/v1/inventories/reserve`,
        {
          method: "POST",
          headers: this.internalHeaders(),
          body: JSON.stringify({ storeId, productId, quantity, userId, sagaId }),
        },
      );
    } catch (err) {
      throw AppError.serviceUnavailable(
        "Inventory service is currently unavailable",
      );
    }

    if (!res.ok) {
      const body = (await res.json()) as {
        message?: string;
        availableStock?: number;
      };
      if (res.status === 400) {
        logger.warn(
          `INSUFFICIENT_STOCK:${body.availableStock ?? 0}:${productId}`,
          { storeId, productId, userId, sagaId, quantity },
        );
        throw new Error(
          `INSUFFICIENT_STOCK:${body.availableStock ?? 0}:${productId}`,
        );
      }
      if (res.status === 409) {
        logger.warn(`STOCK_CONTENTION:${productId}`, {
          storeId, productId, userId, sagaId, quantity,
        });
        throw new Error(`STOCK_CONTENTION:${productId}`);
      }
      logger.warn(`RESERVE_FAILED:${productId}`, {
        storeId, productId, userId, sagaId, quantity,
      });
      throw new Error(`RESERVE_FAILED:${productId}`);
    }
  }

  private async releaseItem(
    storeId: string,
    productId: string,
    quantity: number,
    sagaId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.fetchWithTimeout(
        `${INVENTORY_SERVICE_URL}/api/v1/inventories/release`,
        {
          method: "POST",
          headers: this.internalHeaders(),
          body: JSON.stringify({ storeId, productId, quantity, userId, sagaId }),
        },
      );
    } catch (err) {
      logger.error("Release failed during compensation, TTL will clean up", {
        productId,
        sagaId,
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async checkout(
    userId: string,
    storeId: string,
    cartId: string,
    requestId: string,
  ): Promise<IOrder> {
    // Idempotency check
    const existing = await this.repo.getOrderByRequestId(requestId);
    if (existing) {
      logger.info("Duplicate checkout, returning existing order", {
        requestId,
        orderId: existing._id,
      });
      return existing;
    }

    const sagaId = `order-${Date.now()}-${userId}-${requestId}`;
    const cart = await this.fetchCart(cartId);

    if (!cart.cartItems.length) {
      logger.warn("Cart is empty:", { userId, storeId, cartId, requestId });
      throw AppError.badRequest("Cart is empty");
    }

    const reservedItems: Array<{ productId: string; quantity: number }> = [];
    const failedItems: Array<{
      productId: string;
      productTitle: string;
      reason: string;
    }> = [];

    for (const item of cart.cartItems) {
      try {
        await this.reserveItem(
          storeId,
          item.productId,
          item.productQuantity,
          `${sagaId}-${item.productId}`,
          userId,
        );
        reservedItems.push({
          productId: item.productId,
          quantity: item.productQuantity,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        failedItems.push({
          productId: item.productId,
          productTitle: item.productTitle,
          reason: msg.startsWith("INSUFFICIENT_STOCK")
            ? "Out of stock"
            : "Reservation failed",
        });

        for (const reserved of reservedItems) {
          await this.releaseItem(
            storeId,
            reserved.productId,
            reserved.quantity,
            `${sagaId}-${reserved.productId}`,
            userId,
          );
        }

        logger.warn("Checkout reservation failed, compensation complete", {
          sagaId,
          failedProduct: item.productId,
          rolledBack: reservedItems.length,
          userId,
        });

        const error = AppError.badRequest("One or more items are unavailable");
        error.failedItems = failedItems;
        throw error;
      }
    }

    const order = await withTransaction(async (session) => {
      return this.repo.createOrder(
        {
          userId: new Types.ObjectId(userId),
          sellerId: new Types.ObjectId(cart.sellerId),
          storeId: new Types.ObjectId(storeId),
          cartId: new Types.ObjectId(cartId),
          fullName: cart.fullName,
          quantity: cart.quantity,
          totalPrice: cart.totalPrice,
          cartItems: cart.cartItems.map((i) => ({
            productId: new Types.ObjectId(i.productId),
            productTitle: i.productTitle,
            productDescription: i.productDescription,
            productPrice: i.productPrice,
            productQuantity: i.productQuantity,
            productImage: i.productImage,
            reservedAt: new Date(),
          })),
          orderStatus: OrderStatus.PAYMENT_PENDING,
          requestId,
          sagaId,
        },
        session,
      );
    });

    await this.writeCache(order._id.toString(), order);

    logger.info("Checkout complete, order in PAYMENT_PENDING", {
      orderId: order._id,
      sagaId,
      userId,
      totalPrice: order.totalPrice,
    });

    return order;
  }

  async addShipping(
    userId: string,
    orderId: string,
    shipping: ShippingAddress,
  ): Promise<IOrder | null> {
    const order = await this.repo.getOrderById(orderId);

    if (!order) {
      logger.warn("Order not found", { userId, orderId });
      throw AppError.notFound("Order was not found for the order id provided");
    }

    if (order.userId.toString() !== userId) {
      logger.warn("Unauthorized shipping update attempt", { userId, orderId });
      throw AppError.forbidden(
        "You are not authorized to perform this operation since you are not the owner of this order item",
      );
    }

    const mutableStates: OrderStatus[] = [
      OrderStatus.PAYMENT_PENDING,
      OrderStatus.PAYMENT_INITIATED,
    ];

    if (!mutableStates.includes(order.orderStatus)) {
      logger.warn(
        `Cannot update shipping for order in status: ${order.orderStatus}`,
        { userId, orderId, status: order.orderStatus },
      );
      throw AppError.badRequest(
        `Cannot update shipping for order in status: ${order.orderStatus}`,
      );
    }

    const updated = await this.repo.updateOrderStatus(
      orderId,
      order.orderStatus,
      { shipping },
    );

    if (updated) await this.writeCache(orderId, updated);
    return updated;
  }

  async getOrderById(orderId: string): Promise<IOrder | null> {
    const cacheKey = this.getCacheKey(orderId);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      logger.warn("Order cache read failed", { orderId });
    }

    const order = await this.repo.getOrderById(orderId);
    if (order) await this.writeCache(orderId, order);
    return order;
  }

  async getUserOrders(
    query: FilterQuery<IOrder>,
    skip: number,
    limit: number,
  ) {
    const [orders, totalCount] = await Promise.all([
      this.repo.getUserOrders(query, skip, limit),
      Order.countDocuments(query),
    ]);

    return {
      data: { orders, totalCount, totalPages: Math.ceil(totalCount / limit) },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  async confirmPaymentSuccess(
    orderId: string,
    transactionId: string,
    paymentDate: Date,
  ): Promise<IOrder | null> {
    const order = await this.repo.updateOrderStatus(
      orderId,
      OrderStatus.COMPLETED,
      { transactionId, paymentDate },
    );
    if (order) await this.writeCache(orderId, order);
    return order;
  }

  async markPaymentFailed(
    orderId: string,
    reason?: string,
  ): Promise<IOrder | null> {
    const order = await this.repo.updateOrderStatus(
      orderId,
      OrderStatus.FAILED,
      { failureReason: reason ?? "Payment failed" },
    );
    if (order) await this.writeCache(orderId, order);
    return order;
  }

  async updateOrderToOutOfStock(
    orderId: string,
    status: OrderStatus = OrderStatus.OUT_OF_STOCK,
    updates: Partial<IOrder> = {},
  ): Promise<IOrder | null> {
    const order = await this.repo.updateOrderStatus(orderId, status, updates);
    if (order) await this.writeCache(orderId, order);
    return order;
  }

  async updateFulfillment(
    sellerId: string,
    orderId: string,
    status: FulfillmentStatus,
    trackingNumber?: string,
    courierName?: string,
  ): Promise<IOrder | null> {
    const order = await this.repo.getOrderById(orderId);

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    if (order.sellerId.toString() !== sellerId) {
      logger.warn("Unauthorized fulfillment update attempt", {
        sellerId,
        orderId,
        status,
      });
      throw AppError.forbidden("Unauthorized");
    }

    if (order.orderStatus !== OrderStatus.COMPLETED) {
      logger.warn(
        `Cannot update fulfillment for order in payment status: ${order.orderStatus}`,
        { sellerId, orderId, status },
      );
      throw AppError.badRequest(
        `Cannot update fulfillment for order in payment status: ${order.orderStatus}`,
      );
    }

    if (
      !fulfillmentTransitions({
        prevStatus: order.fulfillmentStatus,
        currStatus: status,
      })
    ) {
      logger.warn(
        `Invalid transition: ${order.fulfillmentStatus} to ${status}`,
        { sellerId, orderId, status },
      );
      throw AppError.badRequest(
        `Invalid transition: ${order.fulfillmentStatus} to ${status}`,
      );
    }

    const updates: Partial<IOrder> = { fulfillmentStatus: status };
    if (trackingNumber) updates.trackingNumber = trackingNumber;
    if (courierName) updates.courierName = courierName;

    const updated = await this.repo.updateOrderStatus(
      orderId,
      order.orderStatus,
      updates,
    );

    if (updated) {
      await this.writeCache(orderId, updated);
      logger.info("Fulfillment status updated", {
        orderId,
        from: order.fulfillmentStatus,
        to: status,
        sellerId,
      });
    }

    return updated;
  }

  async markPaymentInitiated(
    orderId: string,
    transactionId: string,
  ): Promise<IOrder | null> {
    const order = await this.repo.updateOrderStatus(
      orderId,
      OrderStatus.PAYMENT_INITIATED,
      { transactionId },
    );
    if (order) await this.writeCache(orderId, order);
    logger.info("Order marked PAYMENT_INITIATED", { orderId, transactionId });
    return order;
  }

  async generateAndPersistReceipt(
    orderId: string,
    transactionId: string,
    paymentDate: Date,
    storeName: string,
  ): Promise<string | null> {
    const order = await this.repo.getOrderById(orderId);
    if (!order) {
      logger.error("Order not found for receipt generation", { orderId });
      return null;
    }

    try {
      const buffer = await generateReceiptBuffer({
        order,
        storeName,
        transactionId,
        paymentDate,
      });

      const publicId = `receipt_${orderId}_${Date.now()}`;
      const receiptUrl = await uploadToCloudinary(buffer, publicId);

      await this.repo.updateReceiptUrl(orderId, receiptUrl);
      await this.invalidateCache(orderId);

      logger.info("Receipt generated and persisted", { orderId, receiptUrl });
      return receiptUrl;
    } catch (err: any) {
      logger.error("Receipt generation failed", {
        orderId,
        error: err.message,
      });
      return null;
    }
  }
}

export const orderService = new OrderService();