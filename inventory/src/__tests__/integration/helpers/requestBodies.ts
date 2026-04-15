import mongoose from "mongoose";
import { DEFAULT_PRODUCT_ID, SELLER_ID } from "./seeders";

export function validInventoryCreateBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    productId: new mongoose.Types.ObjectId().toString(), 
    ownerId: SELLER_ID,
    quantityOnHand: 100,
    availableStock: 100,      
    reorderPoint: 10,
    reorderQuantity: 50,
    productTitle: "Nike Air Max",
    storeName: "Jane Sneakers",
    storeDomain: "jane-sneakers.selleasi.com",
    ownerName: "Jane Doe",
    ownerEmail: "jane@example.com",
    ...overrides,
  };
}