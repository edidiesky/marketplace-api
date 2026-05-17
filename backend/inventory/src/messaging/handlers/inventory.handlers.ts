import type { Channel, ConsumeMessage } from "amqplib";
import { Types }              from "mongoose";
import {
  SERVICE_NAME,
  ROUTING_KEYS,
  MAX_RETRIES,
  BASE_DELAY_MS,
  getJitter,
} from "../../constants";
import { requestContext }     from "../../context/requestContext";
import logger                 from "../../utils/logger";
import { inventoryRepository } from "../../domains/inventory/inventory.repository";

interface ProductCreatedEvent {
  productId:      string;
  storeId:        string;
  ownerId:        string;
  organizationId: string;
  storeName?:     string;
  name?:          string;
}

export const inventoryHandlers: Record<
  string,
  (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ) => Promise<void>
> = {
  [ROUTING_KEYS.PRODUCT_CREATED]: async (
    data:    unknown,
    channel: Channel,
    msg:     ConsumeMessage
  ): Promise<void> => {
    const event = data as ProductCreatedEvent;
    const {
      productId,
      storeId,
      ownerId,
      organizationId,
      storeName,
      name,
    } = event;

    logger.info("inventory_handler_product_created_received", {
      event:     "inventory_handler_product_created_received",
      service:   SERVICE_NAME,
      productId,
      storeId,
      requestId: requestContext.get()?.requestId,
    });

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const existing = await inventoryRepository.findByProductAndStore(
          productId,
          storeId
        );

        if (existing) {
          logger.info("inventory_handler_already_exists", {
            event:     "inventory_handler_already_exists",
            service:   SERVICE_NAME,
            productId,
            storeId,
            requestId: requestContext.get()?.requestId,
          });
          channel.ack(msg);
          return;
        }

        await inventoryRepository.create({
          productId:      new Types.ObjectId(productId),
          storeId:        new Types.ObjectId(storeId),
          ownerId:        new Types.ObjectId(ownerId),
          organizationId: new Types.ObjectId(organizationId),
          storeName,
          productTitle:   name,
          quantityOnHand: 0,
        });

        logger.info("inventory_handler_created", {
          event:     "inventory_handler_created",
          service:   SERVICE_NAME,
          productId,
          storeId,
          requestId: requestContext.get()?.requestId,
        });

        channel.ack(msg);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error("inventory_handler_create_failed", {
          event:     "inventory_handler_create_failed",
          service:   SERVICE_NAME,
          productId,
          storeId,
          attempt:   attempt + 1,
          error:     message,
          requestId: requestContext.get()?.requestId,
        });

        if (attempt === MAX_RETRIES - 1) {
          channel.nack(msg, false, false);
          return;
        }

        const delay =
          Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 30_000) +
          getJitter();
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  },
};