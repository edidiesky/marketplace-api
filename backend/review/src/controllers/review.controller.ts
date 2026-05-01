
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { reviewService } from "../services/review.service";
import { SUCCESSFULLY_CREATED_STATUS_CODE, SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
import { AuthenticatedRequest } from "../types";

const CreateReview = asyncHandler(async (req: Request, res:Response) => {
  const userId = (req as AuthenticatedRequest).user.userId;
  const body = req.body;

  const review = await reviewService.createReview(userId, body);

  res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
    success: true,
    message: "Review submitted successfully",
    data: review,
  });
});

const GetProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, verified, page = 1, limit = 10 } = req.query;

  const reviews = await reviewService.getProductReviews(productId, {
    rating: rating ? Number(rating) : undefined,
    verified: verified === "true" ? true : verified === "false" ? false : undefined,
    page: Number(page),
    limit: Number(limit),
  });

  const stats = await reviewService.getReviewStats(productId);

  res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
    success: true,
    data: { reviews, stats },
  });
});

const RespondToReview = asyncHandler(async (req: Request, res) => {
  const { reviewId } = req.params;
  const { text } = req.body;
  const respondedBy = (req as AuthenticatedRequest).user.userId;

  const review = await reviewService.respondToReview(reviewId, text, respondedBy);

  res.json({
    success: true,
    message: "Response added",
    data: review,
  });
});

const MarkHelpful = asyncHandler(async (req: Request, res) => {
  const { reviewId } = req.params;
  const { helpful } = req.body; // true or false
  const userId = (req as AuthenticatedRequest).user.userId;

  const review = await reviewService.markHelpful(reviewId, userId, helpful);

  res.json({
    success: true,
    message: helpful ? "Marked as helpful" : "Marked as unhelpful",
    data: review,
  });
});

// Admin Routes
const ApproveReview = asyncHandler(async (req: Request, res) => {
  const { reviewId } = req.params;
  const adminId = (req as AuthenticatedRequest).user.userId;

  const review = await reviewService.approveReview(reviewId, adminId);

  res.json({
    success: true,
    message: "Review approved",
    data: review,
  });
});

const RejectReview = asyncHandler(async (req: Request, res) => {
  const { reviewId } = req.params;
  const adminId = (req as AuthenticatedRequest).user.userId;

  const review = await reviewService.rejectReview(reviewId, adminId);

  res.json({
    success: true,
    message: "Review rejected",
    data: review,
  });
});

export {
  CreateReview,
  GetProductReviews,
  RespondToReview,
  MarkHelpful,
  ApproveReview,
  RejectReview,
};