import { Review } from "./ProductReviewList";
import { ReviewStats } from "./ProductReviewSummary";

export const sampleReviews: Review[] = [
  {
    id: "rev_1",
    reviewerName: "Brooke",
    reviewerColor: "#2f4b7c",
    rating: 5,
    date: "Jun 30, 2026",
    content:
      "Came out even better than expected! Can't wait to use for my friend's bachelorette!",
    isVerifiedItem: true,
  },
  {
    id: "rev_2",
    reviewerName: "Shani",
    reviewerColor: "#2f4b7c",
    rating: 5,
    date: "Jun 29, 2026",
    content: "Great communication & it's exactly what I wanted. Thank you again!",
    isVerifiedItem: true,
  },
  {
    id: "rev_3",
    reviewerName: "Jenn",
    reviewerColor: "#3aa6a6",
    rating: 5,
    date: "Jun 22, 2026",
    content:
      "The cups were a nice quality material and the logo held up throughout the entire weekend. Seller was super easy to work with and quickly understood/accommodated our modifications to the design.",
    isVerifiedItem: true,
  },
  {
    id: "rev_4",
    reviewerName: "Destiny",
    reviewerColor: "#4caf50",
    rating: 5,
    date: "Jun 22, 2026",
    content: "Obsessed! They shipped super fast as well!",
    isVerifiedItem: true,
  },
  {
    id: "rev_5",
    reviewerName: "Amara",
    reviewerColor: "#c2185b",
    rating: 4,
    date: "Jun 18, 2026",
    content:
      "Really lovely quality, only reason it's 4 stars is the box arrived slightly dented. Contents were fine though and seller was quick to check in about it.",
    isVerifiedItem: false,
  },
  {
    id: "rev_6",
    reviewerName: "Tolu",
    reviewerColor: "#f9a825",
    rating: 5,
    date: "Jun 10, 2026",
    content:
      "Exactly as pictured, maybe even nicer in person. Will be ordering again for my sister's bridal shower.",
    isVerifiedItem: true,
  },
];

export const sampleReviewStats: ReviewStats = {
  average: 5.0,
  totalCount: 34,
  itemQuality: 5.0,
  shipping: 5.0,
  customerService: 5.0,
  recommendPercent: 100,
  aiHighlights: [
    "Looks great",
    "Helpful seller",
    "Great quality",
    "Love it",
    "Fast shipping",
  ],
  categories: [
    { label: "Suggested" },
    { label: "Quality", count: 12 },
    { label: "Seller service", count: 10 },
    { label: "Appearance", count: 8 },
    { label: "Description accuracy", count: 7 },
    { label: "Shipping & Packaging", count: 6 },
  ],
};