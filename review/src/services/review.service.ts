import { Types } from "mongoose";
import { IReview, ReviewStatus } from "../models/Review";
import logger from "../utils/logger";
import { IReviewRepository } from "../repositories/IReviewRepository";
import { ReviewRepository } from "../repositories/ReviewRepository";
import { withTransaction } from "../utils/connectDB";
import { isValidRating, Rating } from "../types";
export class ReviewService {
  private repo: IReviewRepository;

  constructor() {
    this.repo = new ReviewRepository();
  }

  async createReview(
    userId: string,
    data: {
      productId: string;
      orderId: string;
      rating: number;
      title: string;
      comment: string;
      images?: string[];
      isVerifiedPurchase: boolean;
      productTitle: string;
      productImage?: string;
      storeId: string;
      storeName: string;
      storeLogo?: string;
      reviewerName: string;
      reviewerImage?: string;
    }
  ): Promise<IReview> {
    if (!isValidRating(data.rating)) {
    throw new Error("Rating must be between 1 and 5");
  }
    return withTransaction(async (session) => {
      const review = await this.repo.createReview(
        {
          userId: new Types.ObjectId(userId),
          productId: new Types.ObjectId(data.productId),
          storeId: new Types.ObjectId(data.storeId),
          orderId: new Types.ObjectId(data.orderId),
          rating: data.rating as Rating,
          title: data.title,
          comment: data.comment,
          images: data.images,
          isVerifiedPurchase: data.isVerifiedPurchase,
          productTitle: data.productTitle,
          productImage: data.productImage,
          storeName: data.storeName,
          storeLogo: data.storeLogo,
          reviewerName: data.reviewerName,
          reviewerImage: data.reviewerImage,
        },
        session
      );

      logger.info("Review submitted", {
        reviewId: review._id,
        productId: data.productId,
        userId,
        verified: data.isVerifiedPurchase,
      });

      return review;
    });
  }

  async getProductReviews(
    productId: string,
    filters: {
      rating?: number;
      verified?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    return this.repo.findReviewsByProduct(productId, filters);
  }

  async getStoreReviews(
    storeId: string,
    status?: ReviewStatus,
    page = 1,
    limit = 20
  ) {
    return this.repo.findReviewsByStore(storeId, status, page, limit);
  }

  async getReviewStats(productId: string) {
    return this.repo.getReviewStats(productId);
  }

  async respondToReview(reviewId: string, text: string, respondedBy: string) {
    const review = await this.repo.addResponse(reviewId, text, respondedBy);
    if (!review) {
      logger.error("Review not found:", {
        id: reviewId,
      });
      throw new Error("Review not found");
    }
    return review;
  }

  async markHelpful(reviewId: string, userId: string, helpful: boolean) {
    const vote = helpful ? 1 : -1;
    const review = await this.repo.markHelpful(reviewId, userId, vote);
    if (!review) {
      logger.error("Review not found:", {
        id: reviewId,
      });
      throw new Error("Review not found");
    }
    return review;
  }

  // Admin only
  async approveReview(reviewId: string, adminId: string) {
    return this.repo.approveReview(reviewId, adminId);
  }

  async rejectReview(reviewId: string, adminId: string) {
    return this.repo.rejectReview(reviewId, adminId);
  }
}

// Singleton export
export const reviewService = new ReviewService();
