import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Types } from "mongoose";
import Review, { IReview, ReviewStatus } from "../../models/Review";
import redisClient from "../../config/redis";
import { reviewService } from "../../services/review.service";
import { measureDatabaseQuery } from "../../utils/metrics";

jest.mock("../../models/Review");
jest.mock("../../config/redis");
jest.mock("../../utils/metrics");

const mockedReview = Review as jest.Mocked<typeof Review>;
const mockedRedis = redisClient as jest.Mocked<typeof redisClient>;
const mockedMeasure = measureDatabaseQuery as jest.MockedFunction<
  typeof measureDatabaseQuery
>;

const mockReviewData = {
  _id: new Types.ObjectId(),
  productId: new Types.ObjectId("66c0a27e71a3ea08d6a26f91"),
  storeId: new Types.ObjectId("66c0a27e71a3ea08d6a26f90"),
  userId: new Types.ObjectId("66c0a27e71a3ea08d6a26f8f"),
  orderId: new Types.ObjectId(),
  productTitle: "Great Phone",
  storeName: "Tech Store NG",
  reviewerName: "Victor Okeke",
  rating: 5 as const,
  title: "Best phone ever!",
  comment: "Works perfectly, fast delivery from Lagos!",
  isVerifiedPurchase: true,
  status: ReviewStatus.APPROVED,
  helpfulCount: 12,
  unhelpfulCount: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  reportCount: 2,
};

describe("Review Service - Full Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should create review with auto-approve if verified purchase", async () => {
    mockedReview.create.mockResolvedValue([mockReviewData] as any);

    const result = await reviewService.createReview(
      "66c0a27e71a3ea08d6a26f8f",
      {
        productId: "66c0a27e71a3ea08d6a26f91",
        orderId: "66c0a27e71a3ea08d6a26f92",
        rating: 5,
        title: "Amazing!",
        comment: "Love it!",
        isVerifiedPurchase: true,
        productTitle: "Great Phone",
        storeId: "66c0a27e71a3ea08d6a26f90",
        storeName: "Tech Store NG",
        reviewerName: "Victor Okeke",
      }
    );

    expect(mockedReview.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          rating: 5,
          isVerifiedPurchase: true,
          status: ReviewStatus.APPROVED,
        }),
      ],
      expect.any(Object)
    );

    expect(result.status).toBe(ReviewStatus.APPROVED);
  });

  it("should get product reviews with caching", async () => {
    const reviews = [mockReviewData];
    const mockFind = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn<() => Promise<IReview[]>>().mockResolvedValue(reviews),
    };
    mockedReview.find.mockReturnValue(mockFind as any);
    mockedMeasure.mockImplementation((_name, fn) => fn());

    const result = await reviewService.getProductReviews(
      "66c0a27e71a3ea08d6a26f91"
    );

    expect(mockedReview.find).toHaveBeenCalledWith({
      productId: expect.any(Types.ObjectId),
      status: ReviewStatus.APPROVED,
    });
    expect(result).toEqual(reviews);
  });

  it("should get review stats with aggregation caching", async () => {
    const stats = [
      {
        averageRating: 4.5,
        totalReviews: 89,
        verifiedCount: 67,
        "1star": 2,
        "2star": 3,
        "3star": 8,
        "4star": 20,
        "5star": 56,
      },
    ];

    mockedReview.aggregate.mockResolvedValue(stats);

    const result = await reviewService.getReviewStats(
      "66c0a27e71a3ea08d6a26f91"
    );

    expect(result.averageRating).toBe(4.5);
    expect(result.totalReviews).toBe(89);
    expect(result.ratingDistribution[5]).toBe(56);
  });

  it("should mark review as helpful and invalidate cache", async () => {
    const updatedReview = { ...mockReviewData, helpfulCount: 13 };
    mockedReview.findByIdAndUpdate.mockResolvedValue(updatedReview as any);

    await reviewService.markHelpful(
      "66c0a27e71a3ea08d6a26f93",
      "user123",
      true
    );

    expect(mockedReview.findByIdAndUpdate).toHaveBeenCalledWith(
      "66c0a27e71a3ea08d6a26f93",
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );
  });

  it("should reject invalid rating", async () => {
    await expect(
      reviewService.createReview("user123", {
        productId: "66c0a27e71a3ea08d6a26f91",
        orderId: "66c0a27e71a3ea08d6a26f92",
        rating: 999, // ← Invalid!
        title: "Good",
        comment: "Nice",
        isVerifiedPurchase: false,
        productTitle: "Test",
        storeId: "66c0a27e71a3ea08d6a26f90",
        storeName: "Test Store",
        reviewerName: "User",
      })
    ).rejects.toThrow("Rating must be between 1 and 5");
  });
});
