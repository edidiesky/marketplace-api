import mongoose, { FilterQuery, Types } from "mongoose";
import Review, { IReview, ReviewStatus } from "./review.model";
import redisClient from "../../config/redis";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";

const CACHE_TTL_SHORT = 300;
const CACHE_TTL_LONG  = 600;

function cacheKey(...parts: string[]): string {
  return `review:${parts.join(":")}`;
}

async function invalidateProductCaches(productId: string): Promise<void> {
  try {
    const pattern = cacheKey("list", productId);
    const keys    = await redisClient.keys(`${pattern}*`);
    if (keys.length > 0) await redisClient.del(...keys);
    await redisClient.del(cacheKey("stats", productId));
  } catch (err) {
    logger.warn("review_cache_invalidation_failed", {
      event:     "review_cache_invalidation_failed",
      service:   SERVICE_NAME,
      productId,
      error:     err instanceof Error ? err.message : String(err),
    });
  }
}

export const reviewRepository = {
  async create(
    data:     Partial<IReview>,
    session?: mongoose.ClientSession
  ): Promise<IReview> {
    const status =
      data.isVerifiedPurchase
        ? ReviewStatus.APPROVED
        : ReviewStatus.PENDING;

    const [review] = await Review.create(
      [{ ...data, status }],
      session ? { session } : {}
    );

    await invalidateProductCaches(data.productId!.toString());

    logger.info("review_created", {
      event:     "review_created",
      service:   SERVICE_NAME,
      reviewId:  review._id.toString(),
      productId: data.productId?.toString(),
      verified:  data.isVerifiedPurchase,
    });

    return review;
  },

  async findByProduct(
    productId: string,
    filters: {
      rating?:   number;
      verified?: boolean;
      page?:     number;
      limit?:    number;
    } = {}
  ): Promise<IReview[]> {
    const { rating, verified, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const key = cacheKey(
      "list",
      productId,
      JSON.stringify({ rating, verified, page, limit })
    );

    try {
      const cached = await redisClient.get(key);
      if (cached) return JSON.parse(cached) as IReview[];
    } catch {}

    const query: FilterQuery<IReview> = {
      productId: new Types.ObjectId(productId),
      status:    ReviewStatus.APPROVED,
    };
    if (rating !== undefined)  query["rating"]             = rating;
    if (verified !== undefined) query["isVerifiedPurchase"] = verified;

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IReview[]>()
      .exec();

    try {
      await redisClient.set(key, JSON.stringify(reviews), "EX", CACHE_TTL_SHORT);
    } catch {}

    return reviews;
  },

  async countByProduct(
    productId: string,
    filters: { rating?: number; verified?: boolean } = {}
  ): Promise<number> {
    const query: FilterQuery<IReview> = {
      productId: new Types.ObjectId(productId),
      status:    ReviewStatus.APPROVED,
    };
    if (filters.rating !== undefined)   query["rating"]             = filters.rating;
    if (filters.verified !== undefined) query["isVerifiedPurchase"] = filters.verified;

    return Review.countDocuments(query).exec();
  },

  async findByStore(
    storeId:  string,
    status?:  ReviewStatus,
    page =    1,
    limit =   20
  ): Promise<IReview[]> {
    const query: FilterQuery<IReview> = {
      storeId: new Types.ObjectId(storeId),
    };
    if (status) query["status"] = status;

    return Review.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<IReview[]>()
      .exec();
  },

  async findById(reviewId: string): Promise<IReview | null> {
    const key = cacheKey("single", reviewId);

    try {
      const cached = await redisClient.get(key);
      if (cached) return JSON.parse(cached) as IReview;
    } catch {}

    const review = await Review.findById(reviewId)
      .lean<IReview>()
      .exec();

    if (review) {
      try {
        await redisClient.set(
          key,
          JSON.stringify(review),
          "EX",
          CACHE_TTL_LONG
        );
      } catch {}
    }

    return review;
  },

  async existsByOrderAndProduct(
    orderId:   string,
    productId: string
  ): Promise<boolean> {
    const count = await Review.countDocuments({
      orderId:   new Types.ObjectId(orderId),
      productId: new Types.ObjectId(productId),
    }).exec();
    return count > 0;
  },

  async updateStatus(
    reviewId:  string,
    status:    ReviewStatus,
    adminId:   string
  ): Promise<IReview | null> {
    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        $set: {
          status,
          moderatedBy: new Types.ObjectId(adminId),
          moderatedAt: new Date(),
        },
      },
      { new: true }
    )
      .lean<IReview>()
      .exec();

    if (review) {
      await Promise.all([
        redisClient.del(cacheKey("single", reviewId)),
        invalidateProductCaches(review.productId.toString()),
      ]);

      logger.info("review_status_updated", {
        event:    "review_status_updated",
        service:  SERVICE_NAME,
        reviewId,
        status,
        adminId,
      });
    }

    return review;
  },

  async addResponse(
    reviewId:    string,
    text:        string,
    respondedBy: string
  ): Promise<IReview | null> {
    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        $set: {
          "response.text":          text,
          "response.respondedBy":   new Types.ObjectId(respondedBy),
          "response.respondedAt":   new Date(),
        },
      },
      { new: true }
    )
      .lean<IReview>()
      .exec();

    if (review) {
      await redisClient.del(cacheKey("single", reviewId));
    }

    return review;
  },

  async markHelpful(
    reviewId: string,
    vote:     1 | -1
  ): Promise<IReview | null> {
    const field = vote === 1 ? "helpfulCount" : "unhelpfulCount";

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $inc: { [field]: 1 } },
      { new: true }
    )
      .lean<IReview>()
      .exec();

    if (review) {
      await Promise.all([
        redisClient.del(cacheKey("single", reviewId)),
        redisClient.del(
          cacheKey("list", review.productId.toString())
        ),
      ]);
    }

    return review;
  },

  async getStats(productId: string): Promise<{
    averageRating:      number;
    totalReviews:       number;
    verifiedCount:      number;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  }> {
    const key = cacheKey("stats", productId);

    try {
      const cached = await redisClient.get(key);
      if (cached) return JSON.parse(cached);
    } catch {}

    const results = await Review.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
          status:    ReviewStatus.APPROVED,
        },
      },
      {
        $group: {
          _id:           null,
          averageRating: { $avg: "$rating" },
          totalReviews:  { $sum: 1 },
          verifiedCount: { $sum: { $cond: ["$isVerifiedPurchase", 1, 0] } },
          "1star":       { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          "2star":       { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          "3star":       { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          "4star":       { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          "5star":       { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        },
      },
    ]);

    const raw = results[0] ?? {
      averageRating: 0,
      totalReviews:  0,
      verifiedCount: 0,
      "1star": 0, "2star": 0, "3star": 0, "4star": 0, "5star": 0,
    };

    const stats = {
      averageRating: Number(raw.averageRating?.toFixed(2)) || 0,
      totalReviews:  raw.totalReviews  || 0,
      verifiedCount: raw.verifiedCount || 0,
      ratingDistribution: {
        1: raw["1star"] || 0,
        2: raw["2star"] || 0,
        3: raw["3star"] || 0,
        4: raw["4star"] || 0,
        5: raw["5star"] || 0,
      } as Record<1 | 2 | 3 | 4 | 5, number>,
    };

    try {
      await redisClient.set(key, JSON.stringify(stats), "EX", CACHE_TTL_LONG);
    } catch {}

    return stats;
  },
};