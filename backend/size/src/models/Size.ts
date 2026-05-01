import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISize {
  user: Types.ObjectId;
  store: Types.ObjectId; 
  name: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const SizeSchema = new Schema<ISize>(
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


SizeSchema.index({ store: 1, _id: 1 });

const SizeModel = mongoose.model<ISize>("Size", SizeSchema);
export default SizeModel;