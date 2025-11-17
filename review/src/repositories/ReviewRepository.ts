import Review, { IReview, ReviewStatus } from "../models/Review";
import { IReviewRepository } from "./IReviewRepository";
import logger from "../utils/logger";
import mongoose, { FilterQuery, Types } from "mongoose";
import redisClient from "../config/redis";
import { measureDatabaseQuery } from "../utils/metrics";

export class ReviewRepository implements IReviewRepository {
  private getCacheKey(...parts: string[]): string {
    return `review:${parts.join(":")}`;
  }

  async createReview(
    data: Partial<IReview> & {
      productId: Types.ObjectId;
      storeId: Types.ObjectId;
      userId: Types.ObjectId;
      orderId: Types.ObjectId;
    },
    session?: mongoose.ClientSession
  ): Promise<IReview> {
    try {
      const review = await Review.create(
        [
          {
            ...data,
            status: data.isVerifiedPurchase
              ? ReviewStatus.APPROVED
              : ReviewStatus.PENDING,
          },
        ],
        { session }
      );

      const createdReview = review[0];

      // Invalidate product stats cache
      await Promise.all([
        redisClient.del(this.getCacheKey("stats", data.productId.toString())),
        redisClient.del(this.getCacheKey("list", data.productId.toString())),
      ]);

      logger.info("Review created successfully", {
        reviewId: createdReview._id,
        productId: data.productId,
        verified: data.isVerifiedPurchase,
      });

      return createdReview;
    } catch (error) {
      logger.error("Failed to create review", {
        error: error instanceof Error ? error.message : error,
        data,
      });
      throw error;
    }
  }

  async findReviewsByProduct(
    productId: string,
    filters: {
      rating?: number;
      verified?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<IReview[]> {
    const { rating, verified, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const cacheKey = this.getCacheKey(
      "list",
      productId,
      JSON.stringify({ rating, verified, page, limit })
    );

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const query: FilterQuery<IReview> = {
      productId: new Types.ObjectId(productId),
      status: ReviewStatus.APPROVED,
    };

    if (rating) query.rating = rating;
    if (verified !== undefined) query.isVerifiedPurchase = verified;

    const reviews = await measureDatabaseQuery("fetch_product_reviews", () =>
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-__v")
        .lean()
    );

    await redisClient.set(cacheKey, JSON.stringify(reviews), "EX", 300); // 5 min
    return reviews;
  }

  async findReviewsByStore(
    storeId: string,
    status?: ReviewStatus,
    page = 1,
    limit = 20
  ): Promise<IReview[]> {
    const query: FilterQuery<IReview> = {
      storeId: new Types.ObjectId(storeId),
    };
    if (status) query.status = status;

    return Review.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "name image")
      .lean();
  }

  async findReviewById(reviewId: string): Promise<IReview | null> {
    const cacheKey = this.getCacheKey("single", reviewId);
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const review = await Review.findById(reviewId)
      .populate("userId", "name image")
      .populate("response.respondedBy", "name");

    if (review) {
      await redisClient.set(cacheKey, JSON.stringify(review), "EX", 600);
    }

    return review;
  }

  async approveReview(
    reviewId: string,
    adminId: string
  ): Promise<IReview | null> {
    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        status: ReviewStatus.APPROVED,
        moderatedBy: new Types.ObjectId(adminId),
        moderatedAt: new Date(),
      },
      { new: true }
    );

    if (review) {
      await this.invalidateCaches(review.productId.toString());
      logger.info("Review approved", { reviewId, adminId });
    }

    return review;
  }

  async rejectReview(
    reviewId: string,
    adminId: string
  ): Promise<IReview | null> {
    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        status: ReviewStatus.REJECTED,
        moderatedBy: new Types.ObjectId(adminId),
        moderatedAt: new Date(),
      },
      { new: true }
    );

    if (review) {
      await this.invalidateCaches(review.productId.toString());
    }

    return review;
  }

  async addResponse(
    reviewId: string,
    text: string,
    respondedBy: string
  ): Promise<IReview | null> {
    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        $set: {
          "response.text": text,
          "response.respondedBy": new Types.ObjectId(respondedBy),
          "response.respondedAt": new Date(),
        },
      },
      { new: true }
    );

    if (review) {
      await redisClient.del(this.getCacheKey("single", reviewId));
    }

    return review;
  }

  async markHelpful(
    reviewId: string,
    userId: string,
    vote: 1 | -1
  ): Promise<IReview | null> {
    const field = vote === 1 ? "helpfulCount" : "unhelpfulCount";

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $inc: { [field]: 1 } },
      { new: true }
    );

    if (review) {
      await redisClient.del(this.getCacheKey("single", reviewId));
      await redisClient.del(
        this.getCacheKey("list", review.productId.toString())
      );
    }

    return review;
  }

  async getReviewStats(productId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
    verifiedCount: number;
  }> {
    const cacheKey = this.getCacheKey("stats", productId);
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const stats = await Review.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
          status: ReviewStatus.APPROVED,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          verifiedCount: {
            $sum: { $cond: ["$isVerifiedPurchase", 1, 0] },
          },
          "1star": {
            $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
          },
          "2star": {
            $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
          },
          "3star": {
            $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
          },
          "4star": {
            $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
          },
          "5star": {
            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      averageRating: 0,
      totalReviews: 0,
      verifiedCount: 0,
      "1star": 0,
      "2star": 0,
      "3star": 0,
      "4star": 0,
      "5star": 0,
    };

    const distribution = {
      1: result["1star"] || 0,
      2: result["2star"] || 0,
      3: result["3star"] || 0,
      4: result["4star"] || 0,
      5: result["5star"] || 0,
    };

    const finalStats = {
      averageRating: Number(result.averageRating?.toFixed(2)) || 0,
      totalReviews: result.totalReviews || 0,
      verifiedCount: result.verifiedCount || 0,
      ratingDistribution: distribution,
    };

    await redisClient.set(cacheKey, JSON.stringify(finalStats), "EX", 600);
    return finalStats;
  }

  private async invalidateCaches(productId: string) {
    const pattern = this.getCacheKey("list", productId) + "*";
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(keys);
    await redisClient.del(this.getCacheKey("stats", productId));
  }
}
