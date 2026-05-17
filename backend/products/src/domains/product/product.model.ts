import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProductColor {
  name:  string;
  value: string;
}

export interface IProductSize {
  name:  string;
  value: string;
}

export interface IProduct extends Document {
  _id:            Types.ObjectId;
  ownerId:        Types.ObjectId;
  organizationId: Types.ObjectId;
  storeId:        Types.ObjectId;
  ownerName?:     string;
  storeName?:     string;
  name:           string;
  isArchive:      boolean;
  isDeleted:      boolean;
  images:         string[];
  description?:   string;
  price:          number;
  category:       string[];
  colors:         IProductColor[];
  size:           IProductSize[];
  sku?:           string;
  deletedBy?:     Types.ObjectId;
  deletedAt?:     Date;
  createdAt:      Date;
  updatedAt:      Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    ownerId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    organizationId: {
      type:     Schema.Types.ObjectId,
      ref:      "Organization",
      required: true,
      index:    true,
    },
    storeId: {
      type:     Schema.Types.ObjectId,
      ref:      "Store",
      required: true,
      index:    true,
    },
    ownerName: { type: String },
    storeName: { type: String },
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    isArchive:   { type: Boolean, default: false },
    isDeleted:   { type: Boolean, default: false, index: true },
    images: {
      type: [String],
      validate: {
        validator: (arr: string[]) =>
          arr.every((url) =>
            /^(https?:\/\/.*\.(jpg|jpeg|png|gif|webp))|(^\/.*\.(jpg|jpeg|png|gif|webp))$/i.test(
              url
            )
          ),
        message: "All images must be valid URLs or relative paths",
      },
    },
    description: { type: String, maxlength: 2000 },
    price: {
      type:     Number,
      required: true,
      min:      0,
    },
    category:  { type: [String], default: [] },
    colors: {
      type: [
        {
          name:  { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
      default: [],
    },
    size: {
      type: [
        {
          name:  { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
      default: [],
    },
    sku:       { type: String, sparse: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

ProductSchema.index({ storeId: 1, isDeleted: 1 });
ProductSchema.index({ organizationId: 1, isDeleted: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ name: "text", description: "text" });

export default mongoose.model<IProduct>("Product", ProductSchema);