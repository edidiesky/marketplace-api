import mongoose, { Schema, Document, Types } from "mongoose";

export enum CartItemStatus {
  AVAILABLE    = "available",
  OUT_OF_STOCK = "out_of_stock",
  PRICE_CHANGED = "price_changed",
  DISCONTINUED = "discontinued",
}

export interface ICartItem {
  productId:           Types.ObjectId;
  productTitle:        string;
  productDescription:  string;
  productPrice:        number;
  productQuantity:     number;
  productImage:        string[];
  reservedAt:          Date;
  availabilityStatus:  CartItemStatus;
  unavailabilityReason?: string;
}

export interface ICart extends Document {
  _id:        Types.ObjectId;
  userId:     Types.ObjectId;
  sellerId:   Types.ObjectId;
  organizationId:   string;
  storeId:    Types.ObjectId;
  fullName:   string;
  email?:     string;
  quantity:   number;
  totalPrice: number;
  cartItems:  ICartItem[];
  expireAt:   Date;
  version:    number;
  createdAt:  Date;
  updatedAt:  Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type:     Schema.Types.ObjectId,
      ref:      "Product",
      required: true,
    },
    productTitle:       { type: String, required: true },
    productDescription: { type: String, default: "" },
    productImage:       { type: [String], required: true },
    productPrice:       { type: Number, required: true, min: 0 },
    productQuantity:    { type: Number, required: true, min: 1 },
    reservedAt:         { type: Date },
    availabilityStatus: {
      type:    String,
      enum:    Object.values(CartItemStatus),
      default: CartItemStatus.AVAILABLE,
    },
    unavailabilityReason: { type: String },
  },
  { _id: false }
);

const CartSchema = new Schema<ICart>(
  {
    userId:   { type: Schema.Types.ObjectId, required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, required: true },
    storeId:  { type: Schema.Types.ObjectId, required: true, index: true },
    fullName: { type: String, required: true },
    organizationId: { type: String, required: true },
    email:    { type: String },
    totalPrice: {
      type:     Number,
      required: true,
      min:      0,
    },
    quantity: {
      type:     Number,
      required: true,
      min:      0,
    },
    cartItems: [CartItemSchema],
    expireAt: {
      type:     Date,
      required: true,
      index:    { expireAfterSeconds: 0 },
    },
    version: {
      type:    Number,
      default: 1,
      min:     1,
    },
  },
  { timestamps: true }
);

CartSchema.pre("save", function (next) {
  if (this.isModified() || this.isNew) {
    this.version = Number(this.version || 0) + 1;
  }
  next();
});

CartSchema.index({ userId: 1, storeId: 1 }, { unique: true });
CartSchema.index({ sellerId: 1 });
CartSchema.index({ createdAt: -1 });

export default mongoose.model<ICart>("Cart", CartSchema);