import type { Channel, ConsumeMessage } from "amqplib";
import { Types } from "mongoose";
import {
  SERVICE_NAME,
  ROUTING_KEYS,
  MAX_RETRIES,
  BASE_DELAY_MS,
  getJitter,
} from "../../constants";
import { requestContext } from "../../context/requestContext";
import logger from "../../utils/logger";
import { inventoryRepository } from "../../domains/inventory/inventory.repository";
import { inventoryService } from "../../domains/inventory/inventory.service";
import { publishInventoryCommitFailed, publishInventoryCommitSucceeded } from "../publisher";
import redisClient from "../../config/redis";

export interface ICartItem {
  productId: string;
  productTitle: string;
  productDescription?: string;
  productPrice: number;
  productQuantity: number;
  productImage: string[];
  reservedAt?: Date;
}


interface OrderPaymentConfirmedEvent {
  orderId:   string;
  sagaId:    string;
  storeId:   string;
  userId:    string;
  cartId:    string;
  cartItems: Array<{ productId: string; productQuantity: number }>;
}

interface ProductCreatedEvent {
  productId: string;
  storeId: string;
  ownerId: string;
  organizationId: string;
  storeName?: string;
  name?: string;
  stockQuantity?: number;
}

interface OrderAbandonedEvent {
  orderId:     string;
  userId:      string;
  storeId:     string;
  sagaId:      string;
  cartItems:   ICartItem[];
  abandonedAt: string;
  reason:      string;
}


interface OrderFailedEvent {
  orderId:  string;
  userId:   string;
  storeId:  string;
  sagaId:   string;
  reason:   string;
  failedAt: string;
  cartItems?: ICartItem[];
}

export const inventoryHandlers: Record<
  string,
  (data: unknown, channel: Channel, msg: ConsumeMessage) => Promise<void>
> = {


  [ROUTING_KEYS.PRODUCT_CREATED]: async (
    data: unknown,
    channel: Channel,
    msg: ConsumeMessage,
  ): Promise<void> => {
    const event = data as ProductCreatedEvent;
    const { productId, storeId, ownerId, organizationId, storeName, name } =
      event;

    logger.info("inventory_handler_product_created_received", {
      event: "inventory_handler_product_created_received",
      service: SERVICE_NAME,
      productId,
      storeId,
      requestId: requestContext.get()?.requestId,
      organizationId,
    });

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const existing = await inventoryRepository.findByProductAndStore(
          productId,
          storeId,
        );

        if (existing) {
          logger.info("inventory_handler_already_exists", {
            event: "inventory_handler_already_exists",
            service: SERVICE_NAME,
            productId,
            storeId,
            requestId: requestContext.get()?.requestId,
          });
          channel.ack(msg);
          return;
        }

        await inventoryRepository.create({
          productId: new Types.ObjectId(productId),
          storeId: new Types.ObjectId(storeId),
          ownerId: new Types.ObjectId(ownerId),
          organizationId,
          storeName,
          productTitle: name,
          quantityOnHand: event.stockQuantity ?? 0,
        });

        logger.info("inventory_handler_created", {
          event: "inventory_handler_created",
          service: SERVICE_NAME,
          productId,
          storeId,
          requestId: requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("inventory_handler_create_failed", {
          event: "inventory_handler_create_failed",
          service: SERVICE_NAME,
          productId,
          storeId,
          attempt: attempt + 1,
          error: message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) + getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },
 
  [ROUTING_KEYS.ORDER_PAYMENT_CONFIRMED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as OrderPaymentConfirmedEvent;
    const { orderId, sagaId, storeId, userId, cartItems } = event;
 
    const idempotencyKey = `inv:order-commit:${sagaId}`;
    const acquired = await redisClient.set(idempotencyKey, "1", "EX", 3600, "NX");
    if (!acquired) {
      logger.info("inventory_handler_order_commit_duplicate_skipped", {
        event:     "inventory_handler_order_commit_duplicate_skipped",
        service:   SERVICE_NAME,
        orderId,
        sagaId,
        requestId: requestContext.get()?.requestId,
      });
      channel.ack(msg);
      return;
    }
 
    const committed: Array<{ productId: string; quantity: number }> = [];
 
    try {
      for (const item of cartItems) {
        await inventoryService.commitStock({
          productId: item.productId,
          storeId,
          quantity:  item.productQuantity,
          sagaId:    `${sagaId}-${item.productId}`,
          userId,
        });
        committed.push({ productId: item.productId, quantity: item.productQuantity });
      }
 
      publishInventoryCommitSucceeded({ orderId, sagaId, storeId, userId });
 
      logger.info("inventory_handler_order_commit_succeeded", {
        event:     "inventory_handler_order_commit_succeeded",
        service:   SERVICE_NAME,
        orderId,
        sagaId,
        itemCount: committed.length,
        requestId: requestContext.get()?.requestId,
      });
 
      channel.ack(msg);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (committed.length > 0 && committed.length < cartItems.length) {
        logger.error("inventory_partial_commit_requires_reconciliation", {
          event:     "inventory_partial_commit_requires_reconciliation",
          service:   SERVICE_NAME,
          orderId,
          sagaId,
          committed,
          totalItems: cartItems.length,
          requestId:  requestContext.get()?.requestId,
        });
      }
 
      publishInventoryCommitFailed({
        orderId,
        sagaId,
        storeId,
        userId,
        reason: message,
      });
 
      logger.error("inventory_handler_order_commit_failed", {
        event:     "inventory_handler_order_commit_failed",
        service:   SERVICE_NAME,
        orderId,
        sagaId,
        error:     message,
        requestId: requestContext.get()?.requestId,
      });
      channel.ack(msg);
    }
  },

  [ROUTING_KEYS.ORDER_FAILED]: async (
    data: unknown,
    channel: Channel,
    msg: ConsumeMessage,
  ): Promise<void> => {
    const event = data as OrderFailedEvent;
    const { orderId, storeId, sagaId, userId, reason, cartItems } = event;

    logger.info("inventory_handler_order_failed_received", {
      event: "inventory_handler_order_failed_received",
      service: SERVICE_NAME,
      orderId,
      storeId,
      sagaId,
      reason,
      requestId: requestContext.get()?.requestId,
    });

    if (!cartItems || cartItems.length === 0) {
      logger.warn("inventory_handler_order_failed_no_items", {
        event: "inventory_handler_order_failed_no_items",
        service: SERVICE_NAME,
        orderId,
        sagaId,
        requestId: requestContext.get()?.requestId,
      });
      channel.ack(msg);
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        for (let cart of cartItems) {
          try {
            const existing = await inventoryService.releaseStock({
              storeId,
              productId: cart.productId,
              quantity: cart.productQuantity,
              userId,
              sagaId,
            });
            if (existing) {
              logger.info("inventory_handler_already_exists", {
                event: "inventory_handler_already_exists",
                service: SERVICE_NAME,
                cartItems,
                storeId,
                requestId: requestContext.get()?.requestId,
              });
              channel.ack(msg);
              return;
            }
          } catch (err) {}
        }
        logger.info("inventory_handler_order_failed_compensated", {
          event: "inventory_handler_order_failed_compensated",
          service: SERVICE_NAME,
          orderId,
          sagaId,
          itemCount: cartItems.length,
          requestId: requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("inventory_handler_order_failed_compensation_error", {
          event: "inventory_handler_order_failed_compensation_error",
          service: SERVICE_NAME,
          orderId,
          sagaId,
          attempt: attempt + 1,
          error: message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) + getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },

  [ROUTING_KEYS.ORDER_ABANDONED]: async (
    data: unknown,
    channel: Channel,
    msg: ConsumeMessage,
  ): Promise<void> => {
    const event = data as OrderAbandonedEvent;
    const { orderId, storeId, sagaId, userId, reason, cartItems } = event;

    logger.info("inventory_handler_order_abandoned_received", {
      event: "inventory_handler_order_abandoned_received",
      service: SERVICE_NAME,
      orderId,
      storeId,
      sagaId,
      reason,
      requestId: requestContext.get()?.requestId,
    });

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        for (let cart of cartItems) {
          try {
            const existing = await inventoryService.releaseStock({
              storeId,
              productId: cart.productId,
              quantity: cart.productQuantity,
              userId,
              sagaId,
            });
            if (existing) {
              logger.info("inventory_handler_already_exists", {
                event: "inventory_handler_already_exists",
                service: SERVICE_NAME,
                cartItems,
                storeId,
                requestId: requestContext.get()?.requestId,
              });
              channel.ack(msg);
              return;
            }
          } catch (err) {}
        }

        logger.info("inventory_handler_order_abandoned_compensated", {
          event: "inventory_handler_order_abandoned_compensated",
          service: SERVICE_NAME,
          orderId,
          sagaId,
          itemCount: cartItems?.length ?? 0,
          requestId: requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("inventory_handler_order_abandoned_compensation_error", {
          event: "inventory_handler_order_abandoned_compensation_error",
          service: SERVICE_NAME,
          orderId,
          sagaId,
          attempt: attempt + 1,
          error: message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) + getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },
};
