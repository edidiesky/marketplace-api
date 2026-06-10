import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInventory extends Document {
  _id:               Types.ObjectId;
  __v:               number;
  ownerId:           Types.ObjectId;
  organizationId:    string;
  productId:         Types.ObjectId;
  storeId:           Types.ObjectId;
  ownerName?:        string;
  ownerEmail?:       string;
  productTitle?:     string;
  productImage?:     string;
  storeName?:        string;
  storeDomain?:      string;
  warehouseName?:    string;
  quantityOnHand:    number;
  quantityAvailable: number;
  quantityReserved:  number;
  reorderPoint:      number;
  reorderQuantity:   number;
  createdAt:         Date;
  updatedAt:         Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    ownerId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    organizationId: {
      type:     String,
      required: true,
      index:    true,
    },
    productId: {
      type:     Schema.Types.ObjectId,
      ref:      "Product",
      required: true,
    },
    storeId: {
      type:     Schema.Types.ObjectId,
      ref:      "Store",
      required: true,
    },
    ownerName:    { type: String },
    ownerEmail:   { type: String },
    productTitle: { type: String },
    productImage: { type: String },
    storeName:    { type: String },
    storeDomain:  { type: String },
    warehouseName:{ type: String },
    quantityOnHand: {
      type:     Number,
      required: true,
      default:  0,
      min:      0,
    },
    quantityAvailable: {
      type:     Number,
      required: true,
      default:  0,
      min:      0,
    },
    quantityReserved: {
      type:    Number,
      default: 0,
      min:     0,
    },
    reorderPoint:    { type: Number, default: 10, min: 0 },
    reorderQuantity: { type: Number, default: 50, min: 0 },
  },
  {
    timestamps: true,
    versionKey: "__v",
  }
);

InventorySchema.index({ productId: 1, storeId: 1 }, { unique: true });
InventorySchema.index({ storeId: 1, quantityAvailable: 1 });
InventorySchema.index({ organizationId: 1 });
InventorySchema.index({ ownerId: 1 });

export default mongoose.model<IInventory>("Inventory", InventorySchema);