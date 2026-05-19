import mongoose, { Schema, Document, Types } from "mongoose";
import { Rating } from "../../types";

export enum ReviewStatus {
  PENDING  = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IReviewResponse {
  text:          string;
  respondedBy:   Types.ObjectId;
  respondedAt:   Date;
}

export interface IReview extends Document {
  _id:              Types.ObjectId;
  productId:        Types.ObjectId;
  storeId:          Types.ObjectId;
  userId:           Types.ObjectId;
  orderId:          Types.ObjectId;
  productTitle:     string;
  productImage?:    string;
  storeName:        string;
  storeLogo?:       string;
  reviewerName:     string;
  reviewerImage?:   string;
  rating:           Rating;
  title:            string;
  comment:          string;
  images?:          string[];
  isVerifiedPurchase: boolean;
  status:           ReviewStatus;
  moderatedBy?:     Types.ObjectId;
  moderatedAt?:     Date;
  helpfulCount:     number;
  unhelpfulCount:   number;
  reportCount:      number;
  response?:        IReviewResponse;
  createdAt:        Date;
  updatedAt:        Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: {
      type:     Schema.Types.ObjectId,
      ref:      "Product",
      required: true,
      index:    true,
    },
    storeId: {
      type:     Schema.Types.ObjectId,
      ref:      "Store",
      required: true,
      index:    true,
    },
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    orderId: {
      type:     Schema.Types.ObjectId,
      ref:      "Order",
      required: true,
      index:    true,
    },
    productTitle:   { type: String, required: true },
    productImage:   { type: String },
    storeName:      { type: String, required: true },
    storeLogo:      { type: String },
    reviewerName:   { type: String, required: true },
    reviewerImage:  { type: String },
    rating: {
      type:     Number,
      required: true,
      min:      [1, "Rating must be at least 1"],
      max:      [5, "Rating cannot exceed 5"],
      enum:     [1, 2, 3, 4, 5],
    },
    title: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 10,
      maxlength: 150,
    },
    comment: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 20,
      maxlength: 2_000,
    },
    images: { type: [String] },
    isVerifiedPurchase: {
      type:    Boolean,
      default: false,
      index:   true,
    },
    status: {
      type:    String,
      enum:    Object.values(ReviewStatus),
      default: ReviewStatus.PENDING,
      index:   true,
    },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderatedAt: { type: Date },
    helpfulCount:   { type: Number, default: 0 },
    unhelpfulCount: { type: Number, default: 0 },
    reportCount:    { type: Number, default: 0 },
    response: {
      text:          { type: String, maxlength: 1_000 },
      respondedBy:   { type: Schema.Types.ObjectId, ref: "User" },
      respondedAt:   { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

ReviewSchema.index({ productId: 1, status: 1, rating: -1 });
ReviewSchema.index({ storeId: 1, status: 1 });
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ status: 1, createdAt: -1 });
ReviewSchema.index({ isVerifiedPurchase: 1, rating: -1 });
ReviewSchema.index({ orderId: 1, productId: 1 }, { unique: true });

export default mongoose.model<IReview>("Review", ReviewSchema);