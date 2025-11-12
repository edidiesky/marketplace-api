import mongoose, { Document, Schema, Types } from "mongoose";

export interface INotification {
  user: Types.ObjectId;
  store: Types.ObjectId;
  name: string;
  isArchive?: boolean;
  images: string[];
  description?: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
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

NotificationSchema.index({ store: 1, _id: 1 });
NotificationSchema.index({ category: 1 });
NotificationSchema.index({ size: 1 });
NotificationSchema.index({ createdAt: -1 });

export default mongoose.model<INotification>("Notification", NotificationSchema);