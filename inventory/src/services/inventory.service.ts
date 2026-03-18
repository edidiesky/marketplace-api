import { FilterQuery, Types } from "mongoose";
import Inventory, { IInventory } from "../models/Inventory";
import { IInventoryRepository } from "../repository/IInventoryRepository";
import { InventoryRepository } from "../repository/InventoryRepository";
import { withTransaction } from "../utils/connectDB";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";

export class InventoryService {
  private InventoryRepo: IInventoryRepository;
  private readonly LOCK_TTL = 10; // seconds
  private readonly RESERVATION_TTL = 600; // 10 minutes in seconds

  constructor() {
    this.InventoryRepo = new InventoryRepository();
  }

  async createInventory(userId: string, data: Partial<IInventory>): Promise<IInventory> {
    return this.InventoryRepo.createInventory(data);
  }

  async getAllInventorys(query: FilterQuery<IInventory>, skip: number, limit: number) {
    const [inventories, totalCount] = await Promise.all([
      this.InventoryRepo.getStoreInventory(query, skip, limit),
      Inventory.countDocuments(query),
    ]);
    return {
      data: { inventories, totalCount, totalPages: Math.ceil(totalCount / limit) },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  async getInventoryById(id: string): Promise<IInventory | null> {
    return this.InventoryRepo.getSingleInventory(id);
  }

  async getInventoryByProduct(productId: string, storeId: string): Promise<IInventory | null> {
    return this.InventoryRepo.getInventoryByProduct(productId, storeId);
  }

  async updateInventory(id: string, data: Partial<IInventory>): Promise<IInventory | null> {
    return this.InventoryRepo.updateInventory(data, id);
  }

  async deleteInventory(id: string): Promise<void> {
    return this.InventoryRepo.deleteInventory(id);
  }

  /**
   * Reserve stock for an order.
   * Uses a Redis lock to prevent concurrent reservation races on the same product.
   * Atomically decrements quantityAvailable and increments quantityReserved.
   * Stores a reservation TTL key in Redis so expired reservations can be cleaned up.
   */
  async reserveStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string
  ): Promise<IInventory> {
    const lockKey = `inv:lock:${storeId}:${productId}`;
    const reservationKey = `inv:reservation:${sagaId}`;

    const alreadyReserved = await redisClient.get(reservationKey);
    if (alreadyReserved) {
      logger.info("Reservation already exists, skipping", { sagaId });
      const inv = await this.InventoryRepo.getInventoryByProduct(productId, storeId);
      if (!inv) throw new Error("INVENTORY_NOT_FOUND");
      return inv;
    }

    const locked = await redisClient.set(lockKey, "1", "EX", this.LOCK_TTL, "NX");
    if (!locked) throw new Error("STOCK_CONTENTION");

    try {
      const inventory = await withTransaction(async (session) => {
        const inv = await Inventory.findOne({
          productId: new Types.ObjectId(productId),
          storeId: new Types.ObjectId(storeId),
        }).session(session);

        if (!inv) throw new Error("INVENTORY_NOT_FOUND");

        if (inv.quantityAvailable < quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${inv.quantityAvailable}`);
        }

        const updated = await Inventory.findOneAndUpdate(
          {
            productId: new Types.ObjectId(productId),
            storeId: new Types.ObjectId(storeId),
            quantityAvailable: { $gte: quantity },
          },
          {
            $inc: {
              quantityAvailable: -quantity,
              quantityReserved: quantity,
            },
            $set: {
              isLowStock: inv.quantityAvailable - quantity <= inv.reorderPoint,
            },
          },
          { new: true, session }
        );

        if (!updated) throw new Error("STOCK_CONTENTION");
        return updated;
      });

      await redisClient.set(
        reservationKey,
        JSON.stringify({ productId, storeId, quantity }),
        "EX",
        this.RESERVATION_TTL
      );

      logger.info("Stock reserved", { productId, storeId, quantity, sagaId });
      return inventory;
    } finally {
      await redisClient.del(lockKey);
    }
  }

  /**
   * Release a reservation back to available.
   * Called on payment failure or cart item deletion.
   */
  async releaseStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string
  ): Promise<IInventory> {
    const lockKey = `inv:lock:${storeId}:${productId}`;
    const reservationKey = `inv:reservation:${sagaId}`;

    const locked = await redisClient.set(lockKey, "1", "EX", this.LOCK_TTL, "NX");
    if (!locked) throw new Error("STOCK_CONTENTION");

    try {
      const inventory = await withTransaction(async (session) => {
        const inv = await Inventory.findOne({
          productId: new Types.ObjectId(productId),
          storeId: new Types.ObjectId(storeId),
        }).session(session);

        if (!inv) throw new Error("INVENTORY_NOT_FOUND");

        if (inv.quantityReserved < quantity) {
          throw new Error("INSUFFICIENT_RESERVATION");
        }

        const updated = await Inventory.findOneAndUpdate(
          {
            productId: new Types.ObjectId(productId),
            storeId: new Types.ObjectId(storeId),
            quantityReserved: { $gte: quantity }, // guard
          },
          {
            $inc: {
              quantityAvailable: quantity,
              quantityReserved: -quantity,
            },
            $set: {
              isLowStock: inv.quantityAvailable + quantity <= inv.reorderPoint,
            },
          },
          { new: true, session }
        );

        if (!updated) throw new Error("STOCK_CONTENTION");
        return updated;
      });

      // Clean up reservation TTL key
      await redisClient.del(reservationKey);

      logger.info("Stock released", { productId, storeId, quantity, sagaId });
      return inventory;
    } finally {
      await redisClient.del(lockKey);
    }
  }

  /**
   * Commit a reservation after successful payment.
   * Decrements quantityReserved and quantityOnHand permanently.
   * quantityAvailable is already reduced from reserve - do not touch it here.
   */
  async commitStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string
  ): Promise<IInventory> {
    const lockKey = `inv:lock:${storeId}:${productId}`;
    const reservationKey = `inv:reservation:${sagaId}`;

    const locked = await redisClient.set(lockKey, "1", "EX", this.LOCK_TTL, "NX");
    if (!locked) throw new Error("STOCK_CONTENTION");

    try {
      const inventory = await withTransaction(async (session) => {
        const inv = await Inventory.findOne({
          productId: new Types.ObjectId(productId),
          storeId: new Types.ObjectId(storeId),
        }).session(session);

        if (!inv) throw new Error("INVENTORY_NOT_FOUND");

        if (inv.quantityReserved < quantity) {
          throw new Error("RESERVATION_NOT_FOUND");
        }

        const updated = await Inventory.findOneAndUpdate(
          {
            productId: new Types.ObjectId(productId),
            storeId: new Types.ObjectId(storeId),
            quantityReserved: { $gte: quantity },
          },
          {
            $inc: {
              quantityReserved: -quantity,
              quantityOnHand: -quantity,
            },
          },
          { new: true, session }
        );

        if (!updated) throw new Error("STOCK_CONTENTION");
        return updated;
      });

      await redisClient.del(reservationKey);

      logger.info("Stock committed", { productId, storeId, quantity, sagaId });
      return inventory;
    } finally {
      await redisClient.del(lockKey);
    }
  }
}

export const inventoryService = new InventoryService();