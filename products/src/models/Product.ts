import mongoose, { Schema, Types } from "mongoose";

export interface IProduct {
  ownerId: Types.ObjectId;
  store: Types.ObjectId;
  ownerName: string;
  storeName: string;
  ownerImage: string;
  tenantId: string;
  name: string;
  isArchive?: boolean;
  images: string[];
  description?: string;
  price: number;
}

const ProductSchema = new Schema<IProduct>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    ownerName: String,
    ownerImage: String,
    tenantId: String,
    storeName:String,
    store: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      unique: true,
      required: true,
    },
    isArchive: {
      type: Boolean,
    },
    images: {
      type: [String],
      match: [
        /^(https?:\/\/.*\.(jpg|jpeg|png|gif))|(^\/.*\.(jpg|jpeg|png|gif))$/i,
        "Must be a valid URL or relative path",
      ],
    },
    description: {
      type: String,
      maxlength: 500,
    },
    price: {
      type: Number,
      min: 0,
      required: true,
    },
  },
  { timestamps: true }
);

ProductSchema.index({ store: 1 });
ProductSchema.index({ ownerId: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ size: 1 });
ProductSchema.index({ createdAt: -1 });

export default mongoose.model<IProduct>("Product", ProductSchema);
