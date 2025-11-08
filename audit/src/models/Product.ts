import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProduct {
  user: Types.ObjectId;
  store: Types.ObjectId;
  name: string;
  isArchive?: boolean;
  images: string[];
  description?: string;
  price: number;
}

const ProductSchema = new Schema<IProduct>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
    },
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

ProductSchema.index({ store: 1, _id: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ size: 1 });
ProductSchema.index({ createdAt: -1 });

export default mongoose.model<IProduct>("Product", ProductSchema);