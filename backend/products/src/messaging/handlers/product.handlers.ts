import { searchRepository } from "../../domains/search/search.repository";
import { OutboxEventType }  from "../../domains/outbox/outbox.model";
import { ESProductDoc }     from "../../domains/search/search.dto";
import logger               from "../../utils/logger";
import { SERVICE_NAME }     from "../../constants";

export const productHandlers: Record<
  OutboxEventType,
  (payload: Record<string, unknown>) => Promise<void>
> = {
  [OutboxEventType.PRODUCT_CREATED]: async (
    payload: Record<string, unknown>
  ): Promise<void> => {
    const doc: ESProductDoc = {
      productId:   payload["productId"]   as string,
      storeId:     payload["storeId"]     as string,
      ownerId:     payload["ownerId"]     as string,
      storeName:   payload["storeName"]   as string,
      name:        payload["name"]        as string,
      description: payload["description"] as string | undefined,
      price:       payload["price"]       as number,
      images:      (payload["images"]     as string[]) ?? [],
      isDeleted:   false,
      createdAt:   payload["createdAt"]   as Date | undefined,
      updatedAt:   payload["createdAt"]   as Date | undefined,
    };

    await searchRepository.upsert(doc);

    logger.info("es_product_upserted_on_create", {
      event:     "es_product_upserted_on_create",
      service:   SERVICE_NAME,
      productId: doc.productId,
      storeId:   doc.storeId,
    });
  },

  [OutboxEventType.PRODUCT_UPDATED]: async (
    payload: Record<string, unknown>
  ): Promise<void> => {
    const productId = payload["productId"] as string;

    const fields: Partial<ESProductDoc> = {};

    if (payload["name"]        !== undefined) fields.name        = payload["name"]        as string;
    if (payload["description"] !== undefined) fields.description = payload["description"] as string;
    if (payload["price"]       !== undefined) fields.price       = payload["price"]       as number;
    if (payload["images"]      !== undefined) fields.images      = payload["images"]      as string[];
    if (payload["isDeleted"]   !== undefined) fields.isDeleted   = payload["isDeleted"]   as boolean;
    if (payload["updatedAt"]   !== undefined) fields.updatedAt   = payload["updatedAt"]   as Date;

    await searchRepository.partialUpdate(productId, fields);

    logger.info("es_product_updated", {
      event:     "es_product_updated",
      service:   SERVICE_NAME,
      productId,
    });
  },

  [OutboxEventType.PRODUCT_DELETED]: async (
    payload: Record<string, unknown>
  ): Promise<void> => {
    const productId = payload["productId"] as string;

    await searchRepository.softDelete(productId);

    logger.info("es_product_soft_deleted", {
      event:     "es_product_soft_deleted",
      service:   SERVICE_NAME,
      productId,
    });
  },
};