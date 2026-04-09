import mongoose from "mongoose";
import { v4 } from "uuid";
import Product, { IProduct } from "../../../models/Product";

export const SELLER_ID = "663e1a1d7b2c3d4e5f6a7b8c";
export const DEFAULT_STORE_ID = new mongoose.Types.ObjectId();

export async function seedProduct(
  overrides: Partial<IProduct> = {},
): Promise<IProduct> {
  const uniqueSuffix = v4().replace(/-/g, "").slice(0, 8);

  const doc = await Product.create({
    ownerId: new mongoose.Types.ObjectId(SELLER_ID),
    store: DEFAULT_STORE_ID,
    name: `Nike Air Max ${uniqueSuffix}`,
    price: 45000,
    images: ["https://cdn.example.com/airmax.jpg"],
    description: "Classic Air Max silhouette.",
    ownerName: "Jane Doe",
    storeName: "Jane Sneakers",
    ownerImage: "https://cdn.example.com/avatar.jpg",
    tenantId: "tenant-1",
    isDeleted: false,
    sku: `NK-${uniqueSuffix}`,
    availableStock: 50,
    thresholdStock: 10,
    trackInventory: true,
    category: ["Footwear"],
    colors: [{ name: "Black", value: "#000000" }],
    size: [{ name: "UK Size", value: "42" }],
    storeDomain: "jane-sneakers.selleasi.com",
    ...overrides,
  });

  return doc.toObject() as IProduct;
}