import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { reviewService }        from "./review.service";
import { AuthenticatedRequest } from "../../middleware/contextMiddleware";
import { ReviewStatus }         from "./review.model";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";

export const CreateReviewHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;

    const review = await reviewService.createReview({
      ...req.body,
      userId,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      message: "Review submitted successfully.",
      data:    review,
    });
  }
);

export const GetProductReviewsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const productId = req.params["productId"] as string;
    const rating    = req.query["rating"]   ? Number(req.query["rating"])   : undefined;
    const verified  = req.query["verified"] === "true"
      ? true
      : req.query["verified"] === "false"
      ? false
      : undefined;
    const page  = Number(req.query["page"]  ?? 1);
    const limit = Number(req.query["limit"] ?? 10);

    const result = await reviewService.getProductReviews(productId, {
      rating,
      verified,
      page,
      limit,
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const GetStoreReviewsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params["storeId"] as string;
    const status  = req.query["status"]  as ReviewStatus | undefined;
    const page    = Number(req.query["page"]  ?? 1);
    const limit   = Number(req.query["limit"] ?? 20);

    const reviews = await reviewService.getStoreReviews(
      storeId,
      status,
      page,
      limit
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    reviews,
    });
  }
);

export const GetReviewByIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const reviewId = req.params["reviewId"] as string;
    const review   = await reviewService.getReviewById(reviewId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    review,
    });
  }
);

export const RespondToReviewHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const reviewId   = req.params["reviewId"] as string;
    const { text }   = req.body as { text: string };
    const { userId } = (req as AuthenticatedRequest).user;

    const review = await reviewService.respondToReview(reviewId, text, userId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      message: "Response added.",
      data:    review,
    });
  }
);

export const MarkHelpfulHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const reviewId        = req.params["reviewId"] as string;
    const { helpful }     = req.body as { helpful: boolean };

    const review = await reviewService.markHelpful(reviewId, helpful);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      message: helpful ? "Marked as helpful." : "Marked as unhelpful.",
      data:    review,
    });
  }
);

export const ApproveReviewHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const reviewId = req.params["reviewId"] as string;
    const { userId }  = (req as AuthenticatedRequest).user;

    const review = await reviewService.approveReview(reviewId, userId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      message: "Review approved.",
      data:    review,
    });
  }
);

export const RejectReviewHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const reviewId = req.params["reviewId"] as string;
    const { userId }  = (req as AuthenticatedRequest).user;

    const review = await reviewService.rejectReview(reviewId, userId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      message: "Review rejected.",
      data:    review,
    });
  }
);