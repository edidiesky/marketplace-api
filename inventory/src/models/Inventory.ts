import mongoose, { Document, Schema, Types } from "mongoose";

export interface IInventory {
  _id: any;
  ownerId: Types.ObjectId;
  productId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  warehouseName: string;
  productTitle: string;
  productImage: string;
  ownerName: string;
  sku: string;
  ownerEmail: string;
  quantityAvailable: number;
  quantityReserved: number;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQuantity: number;
  storeId: Types.ObjectId;
  storeName: string;
  storeDomain: string;
  createdAt: Date;
  updatedAt: Date;
}


const InventorySchema = new Schema<IInventory>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    ownerName: String,
    ownerEmail: String,
    productId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    productImage: [String],
    productTitle: String,
    sku: String,
    storeDomain:String,
    storeName:String,
    storeId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    quantityAvailable: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    quantityReserved: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantityOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reorderPoint: {
      type: Number,
      default: 10,
      min: 0,
    },
    reorderQuantity: {
      type: Number,
      default: 50,
      min: 0,
    },
  },
  { timestamps: true }
);

InventorySchema.index({ storeId: 1, sku: 1 }, { unique: true });
InventorySchema.index({ storeId: 1, isLowStock: 1 });
InventorySchema.index({ ownerId: 1, isLowStock: 1 });
InventorySchema.index({ sku: 1 });
InventorySchema.index({ productId: 1 });

export default mongoose.model<IInventory>("Inventory", InventorySchema);
