import mongoose from "mongoose";
import Inventory, { IInventory } from "../../../models/Inventory";
export const DEFAULT_PRODUCT_ID = new mongoose.Types.ObjectId();
export const SELLER_ID = "663e1a1d7b2c3d4e5f6a7b8c";
export const DEFAULT_STORE_ID = new mongoose.Types.ObjectId();

export async function seedInventory(
  overrides: Partial<IInventory> = {},
): Promise<IInventory> {
  const uniqueProductId = new mongoose.Types.ObjectId();
  const doc = await Inventory.create({
    ownerId: new mongoose.Types.ObjectId(SELLER_ID),
    productId: uniqueProductId,
    storeId: DEFAULT_STORE_ID,
    productTitle: "Nike Air Max",
    quantityAvailable: 100,
    quantityReserved: 0,
    quantityOnHand: 100,
    reorderPoint: 10,
    reorderQuantity: 50,
    storeName: "Jane Sneakers",
    storeDomain: "jane-sneakers.selleasi.com",
    ownerName: "Jane Doe",
    ownerEmail: "jane@example.com",
    ...overrides,
  });

  return doc.toObject() as IInventory;
}
