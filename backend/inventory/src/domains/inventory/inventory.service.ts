import { Types } from "mongoose";
import { inventoryRepository }  from "./inventory.repository";
import { AppError }             from "../../utils/AppError";
import logger                   from "../../utils/logger";
import redisClient              from "../../config/redis";
import {
  SERVICE_NAME,
  MVCC_MAX_RETRIES,
  MVCC_BASE_DELAY_MS,
  RESERVATION_TTL,
  getMvccJitter,
} from "../../constants";
import { requestContext }       from "../../context/requestContext";
import {
  publishInventoryReserved,
  publishInventoryReleased,
  publishInventoryCommitted,
  publishInventoryLow,
} from "../../messaging/publisher";
import {
  CommitStockDto,
  CommitStockResponseDto,
  CreateInventoryDto,
  ExpireReservationDto,
  InventoryListResponseDto,
  InventoryResponseDto,
  ReleaseStockDto,
  ReleaseStockResponseDto,
  ReserveStockDto,
  ReserveStockResponseDto,
  StockAvailabilityResponseDto,
  UpdateInventoryDto,
} from "./inventory.dto";
import { IInventory } from "./inventory.model";

function toDto(inv: IInventory): InventoryResponseDto {
  return {
    inventoryId:       inv._id.toString(),
    ownerId:           inv.ownerId.toString(),
    organizationId:    inv.organizationId.toString(),
    productId:         inv.productId.toString(),
    storeId:           inv.storeId.toString(),
    ownerName:         inv.ownerName!,
    productTitle:      inv.productTitle!,
    storeName:         inv.storeName!,
    warehouseName:     inv.warehouseName,
    quantityOnHand:    inv.quantityOnHand,
    quantityAvailable: inv.quantityAvailable,
    quantityReserved:  inv.quantityReserved,
    reorderPoint:      inv.reorderPoint,
    reorderQuantity:   inv.reorderQuantity,
    isLowStock:        inv.quantityAvailable <= inv.reorderPoint,
    createdAt:         inv.createdAt,
    updatedAt:         inv.updatedAt,
  };
}

async function mvccRetry(
  label:   string,
  fn:      () => Promise<IInventory | null>,
  context: { userId: string; productId: string; sagaId: string }
): Promise<IInventory> {
  for (let attempt = 0; attempt < MVCC_MAX_RETRIES; attempt++) {
    const result = await fn();
    if (result) return result;

    const delay =
      MVCC_BASE_DELAY_MS * Math.pow(2, attempt) + getMvccJitter();

    logger.warn("mvcc_version_conflict", {
      event:       "mvcc_version_conflict",
      service:     SERVICE_NAME,
      label,
      userId:      context.userId,
      productId:   context.productId,
      sagaId:      context.sagaId,
      attempt,
      nextRetryMs: Math.round(delay),
    });

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  logger.error("mvcc_max_retries_exhausted", {
    event:      "mvcc_max_retries_exhausted",
    service:    SERVICE_NAME,
    label,
    userId:     context.userId,
    productId:  context.productId,
    sagaId:     context.sagaId,
    maxRetries: MVCC_MAX_RETRIES,
  });

  throw new Error("STOCK_CONTENTION");
}

export const inventoryService = {
  async createInventory(
    dto: CreateInventoryDto
  ): Promise<InventoryResponseDto> {
    const existing = await inventoryRepository.findByProductAndStore(
      dto.productId,
      dto.storeId
    );

    if (existing) {
      throw AppError.conflict(
        "Inventory record already exists for this product in this store."
      );
    }

    const inventory = await inventoryRepository.create({
      ownerId:        new Types.ObjectId(dto.ownerId),
      organizationId:dto.organizationId,
      productId:      new Types.ObjectId(dto.productId),
      storeId:        new Types.ObjectId(dto.storeId),
      quantityOnHand: dto.quantityOnHand,
      ownerName:      dto.ownerName,
      ownerEmail:     dto.ownerEmail,
      productTitle:   dto.productTitle,
      productImage:   dto.productImage,
      storeName:      dto.storeName,
      storeDomain:    dto.storeDomain,
      warehouseName:  dto.warehouseName,
      reorderPoint:   dto.reorderPoint   ?? 10,
      reorderQuantity:dto.reorderQuantity ?? 50,
    });

    logger.info("inventory_service_created", {
      event:       "inventory_service_created",
      service:     SERVICE_NAME,
      inventoryId: inventory._id.toString(),
      productId:   dto.productId,
      storeId:     dto.storeId,
      requestId:   requestContext.get()?.requestId,
    });

    return toDto(inventory);
  },

  async getStoreInventory(
    storeId: string,
    page:    number,
    limit:   number
  ): Promise<InventoryListResponseDto> {
    const skip  = (page - 1) * limit;
    const query = { storeId: new Types.ObjectId(storeId) };

    const [inventories, total] = await Promise.all([
      inventoryRepository.findAll(query, skip, limit),
      inventoryRepository.count(query),
    ]);

    return {
      inventories: inventories.map(toDto),
      totalCount:  total,
      totalPages:  Math.ceil(total / limit),
      page,
      limit,
    };
  },

  async getInventoryById(
    inventoryId: string
  ): Promise<InventoryResponseDto> {
    const inventory = await inventoryRepository.findById(inventoryId);
    if (!inventory) throw AppError.notFound("Inventory record not found.");
    return toDto(inventory);
  },

  async checkAvailability(
    productId: string,
    storeId:   string
  ): Promise<StockAvailabilityResponseDto> {
    const inventory = await inventoryRepository.findByProductAndStore(
      productId,
      storeId
    );

    if (!inventory) {
      return {
        productId,
        storeId,
        quantityAvailable: 0,
        quantityOnHand:    0,
        quantityReserved:  0,
        isInStock:         false,
      };
    }

    return {
      productId,
      storeId,
      quantityAvailable: inventory.quantityAvailable,
      quantityOnHand:    inventory.quantityOnHand,
      quantityReserved:  inventory.quantityReserved,
      isInStock:         inventory.quantityAvailable > 0,
    };
  },

  async updateInventory(
    inventoryId:    string,
    organizationId: string,
    dto:            UpdateInventoryDto
  ): Promise<InventoryResponseDto> {
    const existing = await inventoryRepository.findById(inventoryId);
    if (!existing) throw AppError.notFound("Inventory record not found.");

    if (existing.organizationId.toString() !== organizationId) {
      throw AppError.forbidden(
        "You do not have permission to update this inventory."
      );
    }

    const updated = await inventoryRepository.updateById(inventoryId, dto);
    if (!updated) throw AppError.notFound("Inventory record not found.");

    logger.info("inventory_service_updated", {
      event:       "inventory_service_updated",
      service:     SERVICE_NAME,
      inventoryId,
      requestId:   requestContext.get()?.requestId,
    });

    return toDto(updated);
  },

  async deleteInventory(
    inventoryId:    string,
    organizationId: string
  ): Promise<void> {
    const existing = await inventoryRepository.findById(inventoryId);
    if (!existing) throw AppError.notFound("Inventory record not found.");

    if (existing.organizationId.toString() !== organizationId) {
      throw AppError.forbidden(
        "You do not have permission to delete this inventory."
      );
    }

    if (existing.quantityReserved > 0) {
      throw AppError.badRequest(
        "Cannot delete inventory with active reservations."
      );
    }

    await inventoryRepository.deleteById(inventoryId);

    logger.info("inventory_service_deleted", {
      event:       "inventory_service_deleted",
      service:     SERVICE_NAME,
      inventoryId,
      requestId:   requestContext.get()?.requestId,
    });
  },

  async reserveStock(
    dto: ReserveStockDto
  ): Promise<ReserveStockResponseDto> {
    const { productId, storeId, quantity, sagaId, userId } = dto;
    const reservationKey = `inv:reservation:${sagaId}`;

    const alreadyReserved = await redisClient.get(reservationKey);
    if (alreadyReserved) {
      logger.info("inventory_reserve_idempotent", {
        event:     "inventory_reserve_idempotent",
        service:   SERVICE_NAME,
        sagaId,
        productId,
        requestId: requestContext.get()?.requestId,
      });
      const inv = await inventoryRepository.findByProductAndStore(
        productId,
        storeId
      );
      if (!inv) throw AppError.notFound("Inventory not found.");
      return {
        reservationId:      `${sagaId}-${productId}`,
        expiresAt:          new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        quantityReserved:   quantity,
        remainingAvailable: inv.quantityAvailable,
      };
    }

    const updated = await mvccRetry(
      "inventory.reserve",
      async () => {
        const current = await inventoryRepository.findByProductAndStore(
          productId,
          storeId
        );

        if (!current) throw AppError.notFound("Inventory not found.");

        if (current.quantityAvailable < quantity) {
          logger.warn("inventory_reserve_insufficient_stock", {
            event:     "inventory_reserve_insufficient_stock",
            service:   SERVICE_NAME,
            productId,
            storeId,
            sagaId,
            requested: quantity,
            available: current.quantityAvailable,
            requestId: requestContext.get()?.requestId,
          });
          throw new Error(`INSUFFICIENT_STOCK:${current.quantityAvailable}`);
        }

        return inventoryRepository.mvccReserve(
          productId,
          storeId,
          quantity,
          current.__v
        );
      },
      { userId, productId, sagaId }
    );

    await redisClient.set(
      reservationKey,
      JSON.stringify({ productId, storeId, quantity, userId }),
      "EX",
      RESERVATION_TTL
    );

    publishInventoryReserved({
      productId,
      storeId,
      quantity,
      sagaId,
      userId,
      remainingAvailable: updated.quantityAvailable,
    });

    if (updated.quantityAvailable <= updated.reorderPoint) {
      publishInventoryLow({
        productId,
        storeId,
        quantityAvailable: updated.quantityAvailable,
        reorderPoint:      updated.reorderPoint,
      });
    }

    logger.info("inventory_reserve_success", {
      event:     "inventory_reserve_success",
      service:   SERVICE_NAME,
      productId,
      storeId,
      sagaId,
      quantity,
      requestId: requestContext.get()?.requestId,
    });

    return {
      reservationId:      `${sagaId}-${productId}`,
      expiresAt:          new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      quantityReserved:   quantity,
      remainingAvailable: updated.quantityAvailable,
    };
  },

  async releaseStock(
    dto: ReleaseStockDto
  ): Promise<ReleaseStockResponseDto> {
    const { productId, storeId, quantity, sagaId, userId } = dto;
    const reservationKey = `inv:reservation:${sagaId}`;

    const updated = await mvccRetry(
      "inventory.release",
      async () => {
        const current = await inventoryRepository.findByProductAndStore(
          productId,
          storeId
        );

        if (!current) throw AppError.notFound("Inventory not found.");

        if (current.quantityReserved < quantity) {
          throw new Error("INSUFFICIENT_RESERVATION");
        }

        return inventoryRepository.mvccRelease(
          productId,
          storeId,
          quantity,
          current.__v
        );
      },
      { userId, productId, sagaId }
    );

    await redisClient.del(reservationKey);

    publishInventoryReleased({
      productId,
      storeId,
      quantity,
      sagaId,
      userId,
    });

    logger.info("inventory_release_success", {
      event:     "inventory_release_success",
      service:   SERVICE_NAME,
      productId,
      storeId,
      sagaId,
      quantity,
      requestId: requestContext.get()?.requestId,
    });

    return {
      releasedQuantity:  quantity,
      newAvailable:      updated.quantityAvailable,
      remainingReserved: updated.quantityReserved,
    };
  },

  async commitStock(
    dto: CommitStockDto
  ): Promise<CommitStockResponseDto> {
    const { productId, storeId, quantity, sagaId, userId } = dto;
    const reservationKey = `inv:reservation:${sagaId}`;

    const updated = await mvccRetry(
      "inventory.commit",
      async () => {
        const current = await inventoryRepository.findByProductAndStore(
          productId,
          storeId
        );

        if (!current) throw AppError.notFound("Inventory not found.");

        if (current.quantityReserved < quantity) {
          throw new Error("RESERVATION_NOT_FOUND");
        }

        return inventoryRepository.mvccCommit(
          productId,
          storeId,
          quantity,
          current.__v
        );
      },
      { userId, productId, sagaId }
    );

    await redisClient.del(reservationKey);

    publishInventoryCommitted({
      productId,
      storeId,
      quantity,
      sagaId,
      userId,
    });

    logger.info("inventory_commit_success", {
      event:     "inventory_commit_success",
      service:   SERVICE_NAME,
      productId,
      storeId,
      sagaId,
      quantity,
      requestId: requestContext.get()?.requestId,
    });

    return {
      committedQuantity:  quantity,
      remainingOnHand:    updated.quantityOnHand,
      remainingReserved:  updated.quantityReserved,
    };
  },

  async expireReservation(
    sagaId:      string,
    dto:         ExpireReservationDto
  ): Promise<{ sagaId: string; quantityRestored: number; newQuantityAvailable: number }> {
    const inventory = await inventoryRepository.findById(dto.inventoryId);
    if (!inventory) throw AppError.notFound("Inventory not found.");

    const result = await inventoryService.releaseStock({
      productId: inventory.productId.toString(),
      storeId:   inventory.storeId.toString(),
      quantity:  dto.quantity,
      sagaId,
      userId:    "system",
    });

    logger.info("inventory_reservation_expired", {
      event:       "inventory_reservation_expired",
      service:     SERVICE_NAME,
      sagaId,
      inventoryId: dto.inventoryId,
      quantity:    dto.quantity,
      requestId:   requestContext.get()?.requestId,
    });

    return {
      sagaId,
      quantityRestored:    dto.quantity,
      newQuantityAvailable: result.newAvailable,
    };
  },
};