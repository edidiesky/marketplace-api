import mongoose, { Types } from "mongoose";
import { reviewRepository }   from "./review.repository";
import { AppError }           from "../../utils/AppError";
import logger                 from "../../utils/logger";
import { requestContext }     from "../../context/requestContext";
import { isValidRating, Rating } from "../../types";
import {
  publishReviewCreated,
  publishReviewApproved,
} from "../../messaging/publisher";
import {
  CreateReviewDto,
  ReviewFiltersDto,
  ReviewListResponseDto,
  ReviewResponseDto,
  ReviewStatsDto,
} from "./review.dto";
import { IReview, ReviewStatus } from "./review.model";
import { SERVICE_NAME }       from "../../constants";

function toDto(review: IReview): ReviewResponseDto {
  return {
    reviewId:           review._id.toString(),
    productId:          review.productId.toString(),
    storeId:            review.storeId.toString(),
    userId:             review.userId.toString(),
    orderId:            review.orderId.toString(),
    productTitle:       review.productTitle,
    productImage:       review.productImage,
    storeName:          review.storeName,
    reviewerName:       review.reviewerName,
    reviewerImage:      review.reviewerImage,
    rating:             review.rating,
    title:              review.title,
    comment:            review.comment,
    images:             review.images,
    isVerifiedPurchase: review.isVerifiedPurchase,
    status:             review.status,
    helpfulCount:       review.helpfulCount,
    unhelpfulCount:     review.unhelpfulCount,
    response:           review.response
      ? {
          text:        review.response.text,
          respondedAt: review.response.respondedAt,
        }
      : undefined,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export const reviewService = {
  async createReview(dto: CreateReviewDto): Promise<ReviewResponseDto> {
    const {
      userId,
      productId,
      storeId,
      orderId,
      rating,
      title,
      comment,
      images,
      isVerifiedPurchase,
      productTitle,
      productImage,
      storeName,
      storeLogo,
      reviewerName,
      reviewerImage,
    } = dto;

    if (!isValidRating(rating)) {
      throw AppError.badRequest("Rating must be between 1 and 5.");
    }

    const alreadyReviewed = await reviewRepository.existsByOrderAndProduct(
      orderId,
      productId
    );

    if (alreadyReviewed) {
      throw AppError.conflict(
        "You have already submitted a review for this product on this order."
      );
    }

    const session = await mongoose.startSession();
    let review!:   IReview;

    await session.withTransaction(async () => {
      review = await reviewRepository.create(
        {
          userId:             new Types.ObjectId(userId),
          productId:          new Types.ObjectId(productId),
          storeId:            new Types.ObjectId(storeId),
          orderId:            new Types.ObjectId(orderId),
          rating:             rating as Rating,
          title,
          comment,
          images,
          isVerifiedPurchase,
          productTitle,
          productImage,
          storeName,
          storeLogo,
          reviewerName,
          reviewerImage,
        },
        session
      );
    });

    session.endSession();

    publishReviewCreated({
      reviewId:  review._id.toString(),
      productId,
      storeId,
      userId,
      rating,
      verified:  isVerifiedPurchase,
    });

    requestContext.set({ eventType: "review.created" });

    logger.info("review_submitted", {
      event:     "review_submitted",
      service:   SERVICE_NAME,
      reviewId:  review._id.toString(),
      productId,
      userId,
      verified:  isVerifiedPurchase,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(review);
  },

  async getProductReviews(
    productId: string,
    filters:   ReviewFiltersDto = {}
  ): Promise<ReviewListResponseDto> {
    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 10;

    const [reviews, stats, totalCount] = await Promise.all([
      reviewRepository.findByProduct(productId, filters),
      reviewRepository.getStats(productId),
      reviewRepository.countByProduct(productId, {
        rating:   filters.rating,
        verified: filters.verified,
      }),
    ]);

    return {
      reviews:    reviews.map(toDto),
      stats,
      totalCount,
      page,
      limit,
    };
  },

  async getStoreReviews(
    storeId: string,
    status?: ReviewStatus,
    page =   1,
    limit =  20
  ): Promise<ReviewResponseDto[]> {
    const reviews = await reviewRepository.findByStore(
      storeId,
      status,
      page,
      limit
    );
    return reviews.map(toDto);
  },

  async getReviewById(reviewId: string): Promise<ReviewResponseDto> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw AppError.notFound("Review not found.");
    return toDto(review);
  },

  async getReviewStats(productId: string): Promise<ReviewStatsDto> {
    return reviewRepository.getStats(productId);
  },

  async respondToReview(
    reviewId:    string,
    text:        string,
    respondedBy: string
  ): Promise<ReviewResponseDto> {
    const review = await reviewRepository.addResponse(
      reviewId,
      text,
      respondedBy
    );

    if (!review) throw AppError.notFound("Review not found.");

    logger.info("review_response_added", {
      event:     "review_response_added",
      service:   SERVICE_NAME,
      reviewId,
      respondedBy,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(review);
  },

  async markHelpful(
    reviewId: string,
    helpful:  boolean
  ): Promise<ReviewResponseDto> {
    const vote   = helpful ? (1 as const) : (-1 as const);
    const review = await reviewRepository.markHelpful(reviewId, vote);

    if (!review) throw AppError.notFound("Review not found.");

    logger.info("review_helpfulness_marked", {
      event:     "review_helpfulness_marked",
      service:   SERVICE_NAME,
      reviewId,
      helpful,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(review);
  },

  async approveReview(
    reviewId: string,
    adminId:  string
  ): Promise<ReviewResponseDto> {
    const review = await reviewRepository.updateStatus(
      reviewId,
      ReviewStatus.APPROVED,
      adminId
    );

    if (!review) throw AppError.notFound("Review not found.");

    publishReviewApproved({
      reviewId,
      productId: review.productId.toString(),
      storeId:   review.storeId.toString(),
      rating:    review.rating,
    });

    logger.info("review_approved", {
      event:     "review_approved",
      service:   SERVICE_NAME,
      reviewId,
      adminId,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(review);
  },

  async rejectReview(
    reviewId: string,
    adminId:  string
  ): Promise<ReviewResponseDto> {
    const review = await reviewRepository.updateStatus(
      reviewId,
      ReviewStatus.REJECTED,
      adminId
    );

    if (!review) throw AppError.notFound("Review not found.");

    logger.info("review_rejected", {
      event:     "review_rejected",
      service:   SERVICE_NAME,
      reviewId,
      adminId,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(review);
  },
};