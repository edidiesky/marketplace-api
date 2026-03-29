import {
  PRODUCT_DELETED_TOPIC,
  PRODUCT_ONBOARDING_COMPLETED_TOPIC,
  PRODUCT_UPDATED_TOPIC,
} from "../../constants";
import { esProductRepository } from "../../repository/ElasticsearchProductRepository";
import logger from "../../utils/logger";

export const EsProductSyncTopic: Record<string, (data: any) => Promise<void>> =
  {
    [PRODUCT_ONBOARDING_COMPLETED_TOPIC]: async (data: any) => {
      const {
        productId,
        storeId,
        ownerId,
        storeName,
        title,
        description,
        price,
        image,
        createdAt,
      } = data;

      await esProductRepository.upsert({
        productId,
        storeId,
        ownerId,
        storeName,
        name: title,
        description,
        price: price ?? 0,
        images: image ? [image] : [],
        isDeleted: false,
        createdAt,
        updatedAt: createdAt,
      });

      logger.info("ES upsert on product created", { productId, storeId });
    },

    [PRODUCT_UPDATED_TOPIC]: async (data: any) => {
      const {
        productId,
        name,
        description,
        price,
        images,
        isDeleted,
        updatedAt,
      } = data;

      await esProductRepository.partialUpdate(productId, {
        name,
        description,
        price,
        images,
        isDeleted,
        updatedAt,
      });

      logger.info("ES partial update on product updated", { productId });
    },

    [PRODUCT_DELETED_TOPIC]: async (data: any) => {
      const { productId } = data;
      await esProductRepository.softDelete(productId);
      logger.info("ES soft delete on product deleted", { productId });
    },
  };
