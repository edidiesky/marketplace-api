import mongoose, { FilterQuery, Types } from "mongoose";
import { orderRepository } from "./order.repository";
import { AppError } from "../../utils/AppError";
import logger from "../../utils/logger";
import {
  SERVICE_NAME,
  CART_SERVICE_URL,
  INVENTORY_SERVICE_URL,
  TIMEOUT_MS,
} from "../../constants";
import { requestContext } from "../../context/requestContext";
import {
  publishOrderCreated,
  publishOrderFailed,
  publishOrderAbandoned,
  publishCartItemOutOfStock,
  publishOrderPaymentConfirmed,
  publishOrderStockCommitted,
  publishOrderCompleted,
  publishNotificationOrderCompleted,
} from "../../messaging/publisher";
import { generateReceiptBuffer } from "../../utils/generateReceipt";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { isValidFulfillmentTransition } from "../../utils/fulfillmentTransitions";
import {
  CartSnapshotDto,
  CheckoutDto,
  FailedItem,
  OrderListResponseDto,
  OrderResponseDto,
  UpdateFulfillmentDto,
} from "./order.dto";
import {
  ICartItem,
  IOrder,
  IShippingAddress,
  OrderStatus,
} from "./order.model";

function toDto(order: IOrder): OrderResponseDto {
  return {
    orderId: order._id.toString(),
    userId: order.userId.toString(),
    sellerId: order.sellerId.toString(),
    storeId: order.storeId.toString(),
    cartId: order.cartId.toString(),
    fullName: order.fullName,
    quantity: order.quantity,
    totalPrice: order.totalPrice,
    cartItems: order.cartItems,
    orderStatus: order.orderStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    paymentChannel: order.paymentChannel,
    transactionId: order.transactionId,
    failureReason: order.failureReason,
    paymentDate: order.paymentDate,
    requestId: order.requestId,
    sagaId: order.sagaId,
    shipping: order.shipping,
    trackingNumber: order.trackingNumber,
    courierName: order.courierName,
    receiptUrl: order.receiptUrl,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function internalHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-internal-secret": process.env.INTERNAL_SECRET ?? "",
  };
}

async function fetchWithTimeout(
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

async function fetchCart(cartId: string): Promise<CartSnapshotDto> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${CART_SERVICE_URL}/api/v1/carts/internal/${cartId}`,
      { method: "GET", headers: internalHeaders() },
    );
  } catch {
    throw AppError.internal("Cart service is currently unavailable.");
  }

  if (res.status === 404) throw AppError.notFound(`Cart ${cartId} not found.`);
  if (!res.ok) throw AppError.badRequest(`Cart fetch failed: ${res.status}`);

  const body = (await res.json()) as { data: CartSnapshotDto };
  return body.data;
}

async function reserveItem(
  storeId: string,
  productId: string,
  quantity: number,
  sagaId: string,
  userId: string,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${INVENTORY_SERVICE_URL}/api/v1/inventories/reserve`,
      {
        method: "POST",
        headers: internalHeaders(),
        body: JSON.stringify({ storeId, productId, quantity, userId, sagaId }),
      },
    );
  } catch {
    throw AppError.internal("Inventory service is currently unavailable.");
  }

  if (!res.ok) {
    const body = (await res.json()) as {
      message?: string;
      availableStock?: number;
    };

    if (res.status === 400) {
      throw new Error(
        `INSUFFICIENT_STOCK:${body.availableStock ?? 0}:${productId}`,
      );
    }
    if (res.status === 409) {
      throw new Error(`STOCK_CONTENTION:${productId}`);
    }
    throw new Error(`RESERVE_FAILED:${productId}`);
  }
}

async function releaseItem(
  storeId: string,
  productId: string,
  quantity: number,
  sagaId: string,
  userId: string,
): Promise<void> {
  try {
    await fetchWithTimeout(
      `${INVENTORY_SERVICE_URL}/api/v1/inventories/release`,
      {
        method: "POST",
        headers: internalHeaders(),
        body: JSON.stringify({ storeId, productId, quantity, userId, sagaId }),
      },
    );
  } catch (err) {
    logger.error("inventory_release_failed_during_compensation", {
      event: "inventory_release_failed_during_compensation",
      service: SERVICE_NAME,
      productId,
      sagaId,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const orderService = {
  async checkout(dto: CheckoutDto): Promise<OrderResponseDto> {
    const { userId, storeId, cartId, requestId } = dto;

    const existing = await orderRepository.findByRequestId(requestId);
    if (existing) {
      logger.info("order_checkout_idempotent", {
        event: "order_checkout_idempotent",
        service: SERVICE_NAME,
        requestId,
        orderId: existing._id.toString(),
        requestId2: requestContext.get()?.requestId,
      });
      return toDto(existing);
    }

    const sagaId = `order-${Date.now()}-${userId}-${requestId}`;
    const cart = await fetchCart(cartId);

    if (!cart.cartItems.length) {
      throw AppError.badRequest("Cart is empty.");
    }

    const reservedItems: Array<{ productId: string; quantity: number }> = [];
    const failedItems: FailedItem[] = [];

    for (const item of cart.cartItems) {
      try {
        await reserveItem(
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
          await releaseItem(
            storeId,
            reserved.productId,
            reserved.quantity,
            `${sagaId}-${reserved.productId}`,
            userId,
          );
        }

        logger.warn("order_checkout_reservation_failed", {
          event: "order_checkout_reservation_failed",
          service: SERVICE_NAME,
          sagaId,
          failedProductId: item.productId,
          rolledBack: reservedItems.length,
          userId,
          requestId: requestContext.get()?.requestId,
        });

        const error = AppError.badRequest("One or more items are unavailable.");
        (error as AppError & { failedItems: FailedItem[] }).failedItems =
          failedItems;
        throw error;
      }
    }

    const session = await mongoose.startSession();
    let order!: IOrder;

    await session.withTransaction(async () => {
      order = await orderRepository.create(
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

    session.endSession();

    publishOrderCreated({
      orderId: order._id.toString(),
      userId,
      storeId,
      sagaId,
      totalPrice: order.totalPrice,
      cartItems: cart.cartItems.map((i) => ({
        productId: i.productId,
        quantity: i.productQuantity,
      })),
    });

    requestContext.set({ eventType: "order.created" });

    logger.info("order_checkout_complete", {
      event: "order_checkout_complete",
      service: SERVICE_NAME,
      orderId: order._id.toString(),
      sagaId,
      userId,
      totalPrice: order.totalPrice,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(order);
  },

  async addShipping(
    userId: string,
    orderId: string,
    shipping: IShippingAddress,
  ): Promise<OrderResponseDto> {
    const order = await orderRepository.findById(orderId);
    if (!order) throw AppError.notFound("Order not found.");

    if (order.userId.toString() !== userId) {
      throw AppError.forbidden("You are not authorized to update this order.");
    }

    const mutableStatuses: OrderStatus[] = [
      OrderStatus.PAYMENT_PENDING,
      OrderStatus.PAYMENT_INITIATED,
    ];

    if (!mutableStatuses.includes(order.orderStatus)) {
      throw AppError.badRequest(
        `Cannot update shipping for order in status: ${order.orderStatus}`,
      );
    }

    const updated = await orderRepository.updateStatus(
      orderId,
      order.orderStatus,
      { shipping },
    );
    if (!updated) throw AppError.notFound("Order not found.");

    logger.info("order_shipping_added", {
      event: "order_shipping_added",
      service: SERVICE_NAME,
      orderId,
      userId,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(updated);
  },

  async getOrderById(orderId: string): Promise<OrderResponseDto> {
    const order = await orderRepository.findById(orderId);
    if (!order) throw AppError.notFound("Order not found.");
    return toDto(order);
  },

  async getOrders(
    query: FilterQuery<IOrder>,
    page: number,
    limit: number,
  ): Promise<OrderListResponseDto> {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      orderRepository.findAll(query, skip, limit),
      orderRepository.count(query),
    ]);

    return {
      orders: orders.map(toDto),
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  },

  async getStatusBreakdown(storeId: string): Promise<Record<OrderStatus, number>> {
    return orderRepository.getStatusBreakdown(storeId);
  },

  async getAnalytics(storeId: string, range: string) {
    const daysByRange: Record<string, number> = {
      "7-days":   7,
      "3-weeks":  21,
      "3-months": 90,
    };
    const days = daysByRange[range] ?? daysByRange["3-months"];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return orderRepository.getAnalytics(storeId, startDate);
  },

  async updateFulfillment(
    dto: UpdateFulfillmentDto,
  ): Promise<OrderResponseDto> {
    const { sellerId, orderId, status, trackingNumber, courierName } = dto;

    const order = await orderRepository.findById(orderId);
    if (!order) throw AppError.notFound("Order not found.");

    if (order.sellerId.toString() !== sellerId) {
      throw AppError.forbidden("You are not authorized to update this order.");
    }

    if (order.orderStatus !== OrderStatus.COMPLETED) {
      throw AppError.badRequest(
        `Cannot update fulfillment for order in status: ${order.orderStatus}`,
      );
    }

    if (!isValidFulfillmentTransition(order.fulfillmentStatus, status)) {
      throw AppError.badRequest(
        `Invalid transition: ${order.fulfillmentStatus} to ${status}`,
      );
    }

    const updates: Partial<IOrder> = { fulfillmentStatus: status };
    if (trackingNumber) updates.trackingNumber = trackingNumber;
    if (courierName) updates.courierName = courierName;

    const updated = await orderRepository.updateStatus(
      orderId,
      order.orderStatus,
      updates,
    );
    if (!updated) throw AppError.notFound("Order not found.");

    logger.info("order_fulfillment_updated", {
      event: "order_fulfillment_updated",
      service: SERVICE_NAME,
      orderId,
      sellerId,
      from: order.fulfillmentStatus,
      to: status,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(updated);
  },

  async confirmPaymentSuccess(
    orderId: string,
    transactionId: string,
    paymentDate: Date,
    storeName: string,
    customerEmail: string,
  customerName:  string,
  ): Promise<OrderResponseDto> {
    const order = await orderRepository.findById(orderId);
    if (!order) throw AppError.notFound("Order not found.");

    const { sagaId, userId, storeId } = order;
    const userIdStr = userId.toString();
    const storeIdStr = storeId.toString();

    const updated = await orderRepository.updateStatus(
      orderId,
      OrderStatus.COMPLETED,
      { transactionId, paymentDate, customerEmail, customerName },
    );
    if (!updated) throw AppError.notFound("Order not found.");

    logger.info("order_payment_confirmed", {
      event: "order_payment_confirmed",
      service: SERVICE_NAME,
      orderId,
      transactionId,
      sagaId,
      requestId: requestContext.get()?.requestId,
    });

    const receiptUrl = await orderService.generateAndPersistReceipt(
      orderId,
      transactionId,
      paymentDate,
      storeName,
    );

    publishOrderPaymentConfirmed({
      orderId,
      sagaId,
      storeId: storeIdStr,
      userId: userIdStr,
      cartId: updated.cartId.toString(),
      cartItems: updated.cartItems,
      receiptUrl: receiptUrl ?? undefined,
    });

    logger.info("order_payment_confirmed_event_published", {
      event: "order_payment_confirmed_event_published",
      service: SERVICE_NAME,
      orderId,
      sagaId,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(updated);
  },

  // is received — inventory has confirmed every line item was committed.
  // Triggers cart-clear and announces the order as fully complete.
  // Previously this method did not exist anywhere in the file, which is
  // why nothing downstream of payment confirmation ever fired.
  async handleInventoryCommitSucceeded(
    orderId: string,
    sagaId: string,
  ): Promise<void> {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      logger.warn("order_handle_commit_succeeded_order_not_found", {
        event: "order_handle_commit_succeeded_order_not_found",
        service: SERVICE_NAME,
        orderId,
        sagaId,
      });
      return;
    }

    const storeIdStr = order.storeId.toString();
    const userIdStr = order.userId.toString();

    publishOrderStockCommitted({
      orderId,
      sagaId,
      storeId: storeIdStr,
      userId: userIdStr,
    });

    const completedEvent = {
      orderId,
      userId: userIdStr,
      cartId: order.cartId.toString(),
      storeId: storeIdStr,
      sagaId,
      receiptUrl: order.receiptUrl ?? undefined,
      completedAt: new Date().toISOString(),
      cartItems: order.cartItems,
      email:        order.customerEmail,
      customerName: order.customerName ?? order.fullName,
    };

    publishOrderCompleted(completedEvent);
    publishNotificationOrderCompleted(completedEvent);

    logger.info("order_saga_completed", {
      event: "order_saga_completed",
      service: SERVICE_NAME,
      orderId,
      sagaId,
      requestId: requestContext.get()?.requestId,
    });
  },

  // Called by order.handlers.ts when ROUTING_KEYS.ORDER_STOCK_COMMIT_FAILED_TOPIC
  // is received — inventory could not commit one or more line items.
  // Reverts the order and signals payment-service to refund via the
  // REFUND_REQUIRED reason prefix, same convention already used by
  // compensateFailedCartClear below.
  async handleInventoryCommitFailed(
    orderId: string,
    sagaId: string,
    reason: string,
  ): Promise<void> {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      logger.warn("order_handle_commit_failed_order_not_found", {
        event: "order_handle_commit_failed_order_not_found",
        service: SERVICE_NAME,
        orderId,
        sagaId,
      });
      return;
    }

    await orderRepository.updateStatus(orderId, OrderStatus.FAILED, {
      failureReason: `Inventory commit failed: ${reason}`,
    });

    publishOrderFailed({
      orderId,
      userId: order.userId.toString(),
      storeId: order.storeId.toString(),
      sagaId,
      reason: "REFUND_REQUIRED:inventory_commit_failed",
      failedAt: new Date().toISOString(),
      cartItems: order.cartItems as ICartItem[],
    });

    logger.error("order_reverted_after_inventory_commit_failed", {
      event: "order_reverted_after_inventory_commit_failed",
      service: SERVICE_NAME,
      orderId,
      sagaId,
      reason,
      requestId: requestContext.get()?.requestId,
    });
  },

  async markPaymentInitiated(
    orderId: string,
    transactionId: string,
  ): Promise<OrderResponseDto> {
    const updated = await orderRepository.updateStatus(
      orderId,
      OrderStatus.PAYMENT_INITIATED,
      { transactionId },
    );
    if (!updated) throw AppError.notFound("Order not found.");

    logger.info("order_payment_initiated", {
      event: "order_payment_initiated",
      service: SERVICE_NAME,
      orderId,
      transactionId,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(updated);
  },

  async markPaymentFailed(
    orderId: string,
    reason?: string,
  ): Promise<OrderResponseDto> {
    const updated = await orderRepository.updateStatus(
      orderId,
      OrderStatus.FAILED,
      { failureReason: reason ?? "Payment failed." },
    );
    if (!updated) throw AppError.notFound("Order not found.");

    publishOrderFailed({
      orderId: updated._id.toString(),
      userId: updated.userId.toString(),
      storeId: updated.storeId.toString(),
      sagaId: updated.sagaId,
      reason: reason ?? "Payment failed.",
      failedAt: new Date().toISOString(),
      cartItems: updated.cartItems as ICartItem[],
    });

    logger.info("order_payment_failed", {
      event: "order_payment_failed",
      service: SERVICE_NAME,
      orderId,
      reason,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(updated);
  },

  async markOutOfStock(
    orderId: string,
    reason?: string,
    failedItems?: FailedItem[],
  ): Promise<OrderResponseDto> {
    const updated = await orderRepository.updateStatus(
      orderId,
      OrderStatus.OUT_OF_STOCK,
      { failureReason: reason },
    );
    if (!updated) throw AppError.notFound("Order not found.");

    publishCartItemOutOfStock({
      cartId: updated.cartId.toString(),
      userId: updated.userId.toString(),
      orderId: updated._id.toString(),
      unavailableItems: failedItems ?? [],
      sagaId: updated.sagaId,
      failedAt: new Date().toISOString(),
    });

    logger.info("order_marked_out_of_stock", {
      event: "order_marked_out_of_stock",
      service: SERVICE_NAME,
      orderId,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(updated);
  },

  async abandonOrder(
    orderId: string,
    reason?: string,
  ): Promise<OrderResponseDto> {
    const order = await orderRepository.findById(orderId);
    if (!order) throw AppError.notFound("Order not found.");

    const abandonable: OrderStatus[] = [
      OrderStatus.PAYMENT_PENDING,
      OrderStatus.PAYMENT_INITIATED,
    ];

    if (!abandonable.includes(order.orderStatus)) {
      throw AppError.badRequest(
        `Cannot abandon order in status: ${order.orderStatus}`,
      );
    }

    const updated = await orderRepository.updateStatus(
      orderId,
      OrderStatus.CANCELLED,
      { failureReason: reason ?? "Abandoned by scheduler." },
    );
    if (!updated) throw AppError.notFound("Order not found.");

    publishOrderAbandoned({
      orderId: updated._id.toString(),
      userId: updated.userId.toString(),
      storeId: updated.storeId.toString(),
      sagaId: updated.sagaId,
      cartItems: updated.cartItems,
      abandonedAt: new Date().toISOString(),
      reason: reason ?? "Abandoned by scheduler.",
    });

    logger.info("order_abandoned", {
      event: "order_abandoned",
      service: SERVICE_NAME,
      orderId,
      reason,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(updated);
  },

  async generateAndPersistReceipt(
    orderId: string,
    transactionId: string,
    paymentDate: Date,
    storeName: string,
  ): Promise<string | null> {
    const order = await orderRepository.findById(orderId);
    if (!order) return null;

    try {
      const buffer = await generateReceiptBuffer({
        order,
        storeName,
        transactionId,
        paymentDate,
      });
      const publicId = `receipt_${orderId}_${Date.now()}`;
      const url = await uploadToCloudinary(buffer, publicId);

      await orderRepository.updateReceiptUrl(orderId, url);

      logger.info("order_receipt_generated", {
        event: "order_receipt_generated",
        service: SERVICE_NAME,
        orderId,
        url,
        requestId: requestContext.get()?.requestId,
      });

      return url;
    } catch (err) {
      logger.error("order_receipt_generation_failed", {
        event: "order_receipt_generation_failed",
        service: SERVICE_NAME,
        orderId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },

  async compensateFailedCartClear(
    orderId: string,
    sagaId: string,
    reason: string,
  ): Promise<void> {
    const order = await orderRepository.findById(orderId);
    if (!order) return;

    for (const item of order.cartItems) {
      try {
        await releaseItem(
          order.storeId.toString(),
          item.productId.toString(),
          item.productQuantity,
          `${sagaId}-${item.productId}`,
          order.userId.toString(),
        );
      } catch (err) {
        logger.error("order_compensation_release_failed", {
          event: "order_compensation_release_failed",
          orderId,
          sagaId,
          productId: item.productId.toString(),
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await orderRepository.updateStatus(orderId, OrderStatus.FAILED, {
      failureReason: `Cart clear failed, order reverted: ${reason}`,
    });

    publishOrderFailed({
      orderId,
      userId: order.userId.toString(),
      storeId: order.storeId.toString(),
      sagaId,
      reason: "REFUND_REQUIRED:cart_clear_failed",
      failedAt: new Date().toISOString(),
    });

    logger.info("order_compensated_after_cart_clear_failure", {
      event: "order_compensated_after_cart_clear_failure",
      orderId,
      sagaId,
    });
  },
};