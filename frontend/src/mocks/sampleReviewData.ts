import type { Review } from "@/types/api";

export interface MockReview extends Review {
  reviewerName: string;
  reviewerAvatarColor: string;
  purchaseMeta?: string; 
  photos?: string[];
  tag?: ReviewTag;
}

export type ReviewTag =
  | "Quality"
  | "Seller service"
  | "Appearance"
  | "Description accuracy"
  | "Shipping & Packaging";

export interface AiSummaryChip {
  label: string;
}

export interface ReviewRatingBreakdown {
  overall: number;
  totalReviews: number;
  quality: number;
  shipping: number;
  customerService: number;
  recommendPercent: number;
  distribution: { stars: 5 | 4 | 3 | 2 | 1; percent: number }[];
}

export const mockAiSummary: AiSummaryChip[] = [
  { label: "Looks great" },
  { label: "Helpful seller" },
  { label: "Great quality" },
  { label: "Love it" },
  { label: "Fast shipping" },
];

export const mockRatingBreakdown: ReviewRatingBreakdown = {
  overall: 5.0,
  totalReviews: 34,
  quality: 5.0,
  shipping: 5.0,
  customerService: 5.0,
  recommendPercent: 100,
  distribution: [
    { stars: 5, percent: 100 },
    { stars: 4, percent: 0 },
    { stars: 3, percent: 0 },
    { stars: 2, percent: 0 },
    { stars: 1, percent: 0 },
  ],
};

export const mockReviewTagCounts: { tag: ReviewTag; count: number }[] = [
  { tag: "Quality", count: 13 },
  { tag: "Seller service", count: 10 },
  { tag: "Appearance", count: 8 },
  { tag: "Description accuracy", count: 7 },
  { tag: "Shipping & Packaging", count: 5 },
];

const AVATAR_COLORS = ["#2F5D4F", "#3B4B8C", "#8C4B3B", "#4B7A8C", "#8C7A3B"];

export const mockReviews: MockReview[] = [
  {
    _id: "rev_1",
    productId: "prod_1",
    userId: "user_brittany",
    reviewerName: "Brittany",
    reviewerAvatarColor: AVATAR_COLORS[0],
    rating: 5,
    comment: "Excellent quality! Such a nice touch for bachelorette",
    purchaseMeta: "12 oz / 50 cups | color: navy blue",
    isApproved: true,
    helpfulCount: 2,
    tag: "Quality",
    photos: [],
    createdAt: "2026-07-07T00:00:00.000Z",
  },
  {
    _id: "rev_2",
    productId: "prod_1",
    userId: "user_brooke",
    reviewerName: "Brooke",
    reviewerAvatarColor: AVATAR_COLORS[1],
    rating: 5,
    comment: "Came out even better than expected! Can't wait to use for my friend's bachelorette!",
    purchaseMeta: "12 oz / 25 cups | color: red",
    isApproved: true,
    helpfulCount: 4,
    tag: "Appearance",
    photos: [],
    createdAt: "2026-06-30T00:00:00.000Z",
  },
  {
    _id: "rev_3",
    productId: "prod_1",
    userId: "user_shani",
    reviewerName: "Shani",
    reviewerAvatarColor: AVATAR_COLORS[2],
    rating: 5,
    comment: "Great communication & it's exactly what I wanted. Thank you again!",
    purchaseMeta: "16 oz / 25 cups | color: blush pink",
    isApproved: true,
    helpfulCount: 1,
    tag: "Seller service",
    photos: [],
    createdAt: "2026-06-29T00:00:00.000Z",
  },
  {
    _id: "rev_4",
    productId: "prod_1",
    userId: "user_jenn",
    reviewerName: "Jenn",
    reviewerAvatarColor: AVATAR_COLORS[3],
    rating: 5,
    comment:
      "The cups were a nice quality material and the logo held up throughout the entire weekend. Seller was super easy to work with and quickly understood/accommodated our modifications to the design.",
    purchaseMeta: "12 oz / 50 cups | color: navy blue",
    isApproved: true,
    helpfulCount: 6,
    tag: "Description accuracy",
    photos: [],
    createdAt: "2026-06-22T00:00:00.000Z",
  },
  {
    _id: "rev_5",
    productId: "prod_1",
    userId: "user_madelyn",
    reviewerName: "Madelyn",
    reviewerAvatarColor: AVATAR_COLORS[4],
    rating: 5,
    comment: "Perfect for the pool day, held up all weekend and looked so cute in every photo.",
    purchaseMeta: "12 oz / 25 cups | color: red",
    isApproved: true,
    helpfulCount: 3,
    tag: "Shipping & Packaging",
    photos: [],
    createdAt: "2026-06-18T00:00:00.000Z",
  },
];

// ── Seller / shop mock data ─────────────────────────────────────────
export interface MockShopStats {
  name: string;
  handle: string;
  location: string;
  rating: number;
  reviewCount: number;
  salesCount: number;
  yearsOnPlatform: number;
  avatarColor: string;
  respondsWithin: string;
  badges: { icon: "shipping" | "replies" | "reviews"; title: string; description: string }[];
  recentReviews: { reviewerName: string; rating: number; comment: string; date: string; purchasedFor: string }[];
  otherProducts: { id: string; name: string; imageColor: string }[];
}

export const mockShop: MockShopStats = {
  name: "Meeghan",
  handle: "thesocialarchives",
  location: "New Jersey, United States",
  rating: 4.9,
  reviewCount: 255,
  salesCount: 2400,
  yearsOnPlatform: 2,
  avatarColor: "#2F5D4F",
  respondsWithin: "a few hours",
  badges: [
    {
      icon: "shipping",
      title: "Smooth shipping",
      description: "Has a history of shipping on time with tracking.",
    },
    {
      icon: "replies",
      title: "Speedy replies",
      description: "Has a history of replying to messages quickly.",
    },
    {
      icon: "reviews",
      title: "Rave reviews",
      description: "Average review rating is 4.8 or higher.",
    },
  ],
  recentReviews: [
    {
      reviewerName: "madelyn",
      rating: 5,
      comment:
        "I ordered escort cards for my wedding and Meeghan was so wonderful and easy to work with! She absolutely killed it and everything turned out so beautiful! She is a fast responder and sent me proofs all...",
      date: "2026-07-07T00:00:00.000Z",
      purchasedFor: "Custom order for madelyn",
    },
    {
      reviewerName: "Angela",
      rating: 5,
      comment: "Just like the photo! Great quality would recommend",
      date: "2026-07-04T00:00:00.000Z",
      purchasedFor: "custom flower name cards",
    },
    {
      reviewerName: "Rilee",
      rating: 4,
      comment: "Item is as described, shipped quickly and well packaged.",
      date: "2026-07-01T00:00:00.000Z",
      purchasedFor: "watercolor place cards",
    },
  ],
  otherProducts: [
    { id: "p1", name: "Custom cups", imageColor: "#D9C9B8" },
    { id: "p2", name: "Name embroidery", imageColor: "#EDEAE3" },
    { id: "p3", name: "Geometric coasters", imageColor: "#E3DCCF" },
    { id: "p4", name: "Table numbers", imageColor: "#D8CFC0" },
  ],
};