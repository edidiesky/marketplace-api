import { FilterQuery, Types } from "mongoose";
import Inventory, { IInventory } from "../models/Inventory";
import { IInventoryRepository } from "../repository/IInventoryRepository";
import { InventoryRepository } from "../repository/InventoryRepository";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";

export class InventoryService {
  private InventoryRepo: IInventoryRepository;
  private readonly RESERVATION_TTL = 600;
  private readonly MAX_RETRIES = 8;
  private readonly BASE_DELAY_MS = 15;

  constructor() {
    this.InventoryRepo = new InventoryRepository();
  }

  async createInventory(
    userId: string,
    data: Partial<IInventory>
  ): Promise<IInventory> {
    return this.InventoryRepo.createInventory(data);
  }

  async getAllInventorys(
    query: FilterQuery<IInventory>,
    skip: number,
    limit: number
  ) {
    const [inventories, totalCount] = await Promise.all([
      this.InventoryRepo.getStoreInventory(query, skip, limit),
      Inventory.countDocuments(query),
    ]);
    return {
      data: {
        inventories,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  async getInventoryById(id: string): Promise<IInventory | null> {
    return this.InventoryRepo.getSingleInventory(id);
  }

  async getInventoryByProduct(
    productId: string,
    storeId: string
  ): Promise<IInventory | null> {
    return this.InventoryRepo.getInventoryByProduct(productId, storeId);
  }

  async updateInventory(
    id: string,
    data: Partial<IInventory>
  ): Promise<IInventory | null> {
    return this.InventoryRepo.updateInventory(data, id);
  }

  async deleteInventory(id: string): Promise<void> {
    return this.InventoryRepo.deleteInventory(id);
  }

  private async mvccRetry(
    label: string,
    fn: () => Promise<IInventory | null>,
    context: { userId: string; productId: string; sagaId: string }
  ): Promise<IInventory> {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      const result = await fn();

      if (result) return result;

      const delay =
        this.BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 20;

      logger.warn(`${label}: MVCC version conflict, retrying`, {
        event: `${label}_version_conflict`,
        userId: context.userId,
        productId: context.productId,
        sagaId: context.sagaId,
        attempt,
        nextRetryMs: Math.round(delay),
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    logger.error(`${label}: max retries exhausted`, {
      event: `${label}_max_retries_exhausted`,
      userId: context.userId,
      productId: context.productId,
      sagaId: context.sagaId,
      maxRetries: this.MAX_RETRIES,
    });

    throw new Error("STOCK_CONTENTION");
  }

  /**
   * Reserve stock for an order.
   * Uses MVCC (optimistic concurrency via __v version field) to handle
   * concurrent reservations without distributed locking.
   * The $gte guard on quantityAvailable ensures atomic insufficient stock detection.
   * Redis reservation key provides idempotency per sagaId.
   */
  async reserveStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string,
    userId: string
  ): Promise<IInventory> {
    const reservationKey = `inv:reservation:${sagaId}`;

    const alreadyReserved = await redisClient.get(reservationKey);
    if (alreadyReserved) {
      logger.info("inventory.reserve.idempotent: reservation already exists", {
        event: "inventory_reserve_idempotent",
        userId,
        productId,
        sagaId,
      });
      const inv = await this.InventoryRepo.getInventoryByProduct(
        productId,
        storeId
      );
      if (!inv) throw new Error("INVENTORY_NOT_FOUND");
      return inv;
    }

    return this.mvccRetry(
      "inventory.reserve",
      async () => {
        const current = await Inventory.findOne({
          productId: new Types.ObjectId(productId),
          storeId: new Types.ObjectId(storeId),
        }).lean();

        if (!current) throw new Error("INVENTORY_NOT_FOUND");

        if (current.quantityAvailable < quantity) {
          logger.warn("inventory.reserve.insufficient_stock", {
            event: "inventory_reserve_insufficient_stock",
            userId,
            productId,
            storeId,
            sagaId,
            requested: quantity,
            available: current.quantityAvailable,
          });
          throw new Error(`INSUFFICIENT_STOCK:${current.quantityAvailable}`);
        }

        const updated = await Inventory.findOneAndUpdate(
          {
            productId: new Types.ObjectId(productId),
            storeId: new Types.ObjectId(storeId),
            quantityAvailable: { $gte: quantity },
            __v: current.__v,
          },
          {
            $inc: {
              quantityAvailable: -quantity,
              quantityReserved: quantity,
              __v: 1,
            },
          },
          { new: true }
        );

        if (updated) {
          await redisClient.set(
            reservationKey,
            JSON.stringify({ productId, storeId, quantity, userId }),
            "EX",
            this.RESERVATION_TTL
          );

          logger.info("inventory.reserve.success", {
            event: "inventory_reserve_success",
            userId,
            productId,
            storeId,
            sagaId,
            quantity,
            quantityAvailable: updated.quantityAvailable,
            quantityReserved: updated.quantityReserved,
            version: updated.__v,
          });
        }

        return updated;
      },
      { userId, productId, sagaId }
    );
  }

  /**
   * Release a reservation back to available.
   * Uses MVCC. Called on payment failure or order cancellation.
   * No distributed lock needed: version guard ensures atomic correctness.
   */
  async releaseStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string,
    userId: string
  ): Promise<IInventory> {
    const reservationKey = `inv:reservation:${sagaId}`;

    return this.mvccRetry(
      "inventory.release",
      async () => {
        const current = await Inventory.findOne({
          productId: new Types.ObjectId(productId),
          storeId: new Types.ObjectId(storeId),
        }).lean();

        if (!current) throw new Error("INVENTORY_NOT_FOUND");

        if (current.quantityReserved < quantity) {
          logger.warn("inventory.release.insufficient_reservation", {
            event: "inventory_release_insufficient_reservation",
            userId,
            productId,
            storeId,
            sagaId,
            requested: quantity,
            reserved: current.quantityReserved,
          });
          throw new Error("INSUFFICIENT_RESERVATION");
        }

        const updated = await Inventory.findOneAndUpdate(
          {
            productId: new Types.ObjectId(productId),
            storeId: new Types.ObjectId(storeId),
            quantityReserved: { $gte: quantity },
            __v: current.__v,
          },
          {
            $inc: {
              quantityAvailable: quantity,
              quantityReserved: -quantity,
              __v: 1,
            },
          },
          { new: true }
        );

        if (updated) {
          await redisClient.del(reservationKey);

          logger.info("inventory.release.success", {
            event: "inventory_release_success",
            userId,
            productId,
            storeId,
            sagaId,
            quantity,
            quantityAvailable: updated.quantityAvailable,
            quantityReserved: updated.quantityReserved,
            version: updated.__v,
          });
        }

        return updated;
      },
      { userId, productId, sagaId }
    );
  }

  /**
   * Commit a reservation after successful payment.
   * Permanently decrements quantityReserved and quantityOnHand.
   * quantityAvailable is already reduced from reserve, do not touch it here.
   * Uses MVCC. No distributed lock needed.
   */
  async commitStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string,
    userId: string
  ): Promise<IInventory> {
    const reservationKey = `inv:reservation:${sagaId}`;

    return this.mvccRetry(
      "inventory.commit",
      async () => {
        const current = await Inventory.findOne({
          productId: new Types.ObjectId(productId),
          storeId: new Types.ObjectId(storeId),
        }).lean();

        if (!current) throw new Error("INVENTORY_NOT_FOUND");

        if (current.quantityReserved < quantity) {
          logger.warn("inventory.commit.reservation_not_found", {
            event: "inventory_commit_reservation_not_found",
            userId,
            productId,
            storeId,
            sagaId,
            requested: quantity,
            reserved: current.quantityReserved,
          });
          throw new Error("RESERVATION_NOT_FOUND");
        }

        const updated = await Inventory.findOneAndUpdate(
          {
            productId: new Types.ObjectId(productId),
            storeId: new Types.ObjectId(storeId),
            quantityReserved: { $gte: quantity },
            __v: current.__v,
          },
          {
            $inc: {
              quantityReserved: -quantity,
              quantityOnHand: -quantity,
              __v: 1,
            },
          },
          { new: true }
        );

        if (updated) {
          await redisClient.del(reservationKey);

          logger.info("inventory.commit.success", {
            event: "inventory_commit_success",
            userId,
            productId,
            storeId,
            sagaId,
            quantity,
            quantityReserved: updated.quantityReserved,
            quantityOnHand: updated.quantityOnHand,
            version: updated.__v,
          });
        }

        return updated;
      },
      { userId, productId, sagaId }
    );
  }
}

export const inventoryService = new InventoryService();