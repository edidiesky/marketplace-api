import mongoose, { FilterQuery } from "mongoose";
import { IInventory } from "../models/Inventory";

export interface IInventoryRepository {
  createInventory: (
    data: Partial<IInventory>,
    session: mongoose.ClientSession
  ) => Promise<IInventory>;
  getStoreInventory: (
    query: FilterQuery<IInventory>,
    skip: number,
    limit: number
  ) => Promise<IInventory[] | null>;
  getSingleInventory: (inventoryId: string) => Promise<IInventory | null>;
  updateInventory: (
    data: Partial<IInventory>,
    inventoryId: string
  ) => Promise<IInventory | null>;
  deleteInventory: (data: string) => Promise<void>;
}
