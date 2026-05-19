import { Rating } from "../../types";
import { ReviewStatus } from "./review.model";

export interface CreateReviewDto {
  userId:             string;
  productId:          string;
  storeId:            string;
  orderId:            string;
  rating:             number;
  title:              string;
  comment:            string;
  images?:            string[];
  isVerifiedPurchase: boolean;
  productTitle:       string;
  productImage?:      string;
  storeName:          string;
  storeLogo?:         string;
  reviewerName:       string;
  reviewerImage?:     string;
}

export interface ReviewFiltersDto {
  rating?:   number;
  verified?: boolean;
  page?:     number;
  limit?:    number;
}

export interface ReviewResponseDto {
  reviewId:           string;
  productId:          string;
  storeId:            string;
  userId:             string;
  orderId:            string;
  productTitle:       string;
  productImage?:      string;
  storeName:          string;
  reviewerName:       string;
  reviewerImage?:     string;
  rating:             Rating;
  title:              string;
  comment:            string;
  images?:            string[];
  isVerifiedPurchase: boolean;
  status:             ReviewStatus;
  helpfulCount:       number;
  unhelpfulCount:     number;
  response?: {
    text:        string;
    respondedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewStatsDto {
  averageRating:      number;
  totalReviews:       number;
  verifiedCount:      number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ReviewListResponseDto {
  reviews:    ReviewResponseDto[];
  stats:      ReviewStatsDto;
  totalCount: number;
  page:       number;
  limit:      number;
}