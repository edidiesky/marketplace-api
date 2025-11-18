import mongoose, { FilterQuery } from "mongoose";
import { IReview, ReviewStatus } from "../models/Review";

export interface IReviewRepository {
  createReview(
    data: Partial<IReview>,
    session?: mongoose.ClientSession
  ): Promise<IReview>;

  findReviewsByProduct(
    productId: string,
    filters: {
      rating?: number;
      verified?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<IReview[]>;

  findReviewsByStore(
    storeId: string,
    status?: ReviewStatus,
    page?: number,
    limit?: number
  ): Promise<IReview[]>;

  findReviewById(reviewId: string): Promise<IReview | null>;
  approveReview(reviewId: string, adminId: string): Promise<IReview | null>;
  rejectReview(reviewId: string, adminId: string): Promise<IReview | null>;
  addResponse(
    reviewId: string,
    text: string,
    respondedBy: string
  ): Promise<IReview | null>;
  markHelpful(reviewId: string, userId: string, vote: 1 | -1): Promise<IReview | null>;
  getReviewStats(productId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
    verifiedCount: number;
  }>;
}