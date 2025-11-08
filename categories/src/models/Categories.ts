import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICategory {
  user: Types.ObjectId;
  store: Types.ObjectId;
  name: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    store: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Store",
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

CategorySchema.index({ store: 1, user: 1 });

const CategoryModel = mongoose.model<ICategory>("Category", CategorySchema);
export default CategoryModel;