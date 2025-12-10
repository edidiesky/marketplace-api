import mongoose, { FilterQuery, Types } from "mongoose";
import Inventory, { IInventory } from "../models/Inventory";
import { withTransaction } from "../utils/connectDB";
import { IInventoryRepository } from "../repository/IInventoryRepository";
import { InventoryRepository } from "../repository/InventoryRepository";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
export class InventoryService {
  private InventoryRepo: IInventoryRepository;
  constructor() {
    this.InventoryRepo = new InventoryRepository();
  }
  /**
   * @description Create Inventory method
   * @param userId
   * @param body
   * @returns
   */
  async createInventory(
    userId: string,
    body: Partial<IInventory>
  ): Promise<IInventory> {
    return withTransaction(async (session) => {
      const inventoryData = {
        ...body,
        ownerId: new Types.ObjectId(userId),
      };

      const Inventory = await this.InventoryRepo.createInventory(
        inventoryData,
        session
      );
      return Inventory;
    });
  }

  /**
   * @description Get all Inventory method
   * @param query
   * @param skip
   * @param limit
   * @returns
   */
  async getAllInventorys(
    query: FilterQuery<IInventory>,
    skip: number,
    limit: number
  ): Promise<{
    data: {
      inventorys: IInventory[] | null;
      totalCount: number;
      totalPages: number;
    };
    success: boolean;
    statusCode: number;
  }> {
    const [inventorys, totalCount] = await Promise.all([
      this.InventoryRepo.getStoreInventory(query, skip, limit),
      Inventory.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: {
        inventorys,
        totalCount,
        totalPages,
      },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  /**
   * @description Get single Inventory method
   * @param query id
   * @returns
   */
  async getInventoryById(id: string): Promise<IInventory | null> {
    return this.InventoryRepo.getSingleInventory(id);
  }

  /**
   * @description update single Inventory method
   * @param id
   * @param body
   * @returns
   */
  async updateInventory(
    id: string,
    body: Partial<IInventory>
  ): Promise<IInventory | null> {
    return this.InventoryRepo.updateInventory(body, id);
  }

  async deleteInventory(id: string): Promise<void> {
    return this.InventoryRepo.deleteInventory(id);
  }
}

export const inventoryService = new InventoryService();
