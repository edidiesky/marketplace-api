import { Rating } from "../types";
import mongoose, { Document, Schema, Types } from "mongoose";

export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IReview {
  _id: Types.ObjectId;

  // Core Relations
  productId: Types.ObjectId;
  storeId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;

  productTitle: string;
  productImage?: string;
  storeName: string;
  storeLogo?: string;
  reviewerName: string;
  reviewerImage?: string;

  // Review Content
  rating: Rating;
  title: string;
  comment: string;
  images?: string[];

  // Verification & Moderation
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  moderatedBy?: Types.ObjectId;
  moderatedAt?: Date;

  // Engagement
  helpfulCount: number;
  unhelpfulCount: number;
  reportCount: number;

  // Store Response
  response?: {
    text: string;
    respondedBy: Types.ObjectId;
    respondedAt: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    productTitle: { type: String, required: true },
    productImage: String,
    storeName: { type: String, required: true },
    storeLogo: String,
    reviewerName: { type: String, required: true },
    reviewerImage: String,

    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      enum: [1, 2, 3, 4, 5],
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 150,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 2000,
    },

    images: [
      {
        type: String,
        validate: {
          validator: (v: string[]) => v.length <= 5,
          message: "Maximum 5 images allowed",
        },
      },
    ],

    isVerifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.PENDING,
      index: true,
    },

    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderatedAt: Date,

    helpfulCount: { type: Number, default: 0 },
    unhelpfulCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },

    response: {
      text: { type: String, maxlength: 1000 },
      respondedBy: { type: Schema.Types.ObjectId, ref: "User" },
      respondedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ReviewSchema.index({ productId: 1, status: 1, rating: -1 });
ReviewSchema.index({ storeId: 1, status: 1 });
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ orderId: 1 });
ReviewSchema.index({ status: 1, createdAt: -1 });
ReviewSchema.index({ isVerifiedPurchase: 1, rating: -1 });

ReviewSchema.index({ orderId: 1, productId: 1 }, { unique: true });

export default mongoose.model<IReview>("Review", ReviewSchema);
