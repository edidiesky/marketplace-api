import { IInventory } from "../models/Inventory";

export interface IInventoryRepository {
  createInventory: (data: Partial<IInventory>) => Promise<IInventory>;
  getStoreInventory: (storeId: string) => Promise<IInventory[]>;
  getSingleInventory: (inventoryId: string) => Promise<IInventory>;
  updateInventory: (
    data: Partial<IInventory>,
    inventoryId: string
  ) => Promise<IInventory>;
  deleteInventory: (data: string) => Promise<void>;
}
