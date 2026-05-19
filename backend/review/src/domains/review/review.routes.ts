import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { authenticate }    from "../../middleware/auth.middleware";
import {
  createReviewSchema,
  respondToReviewSchema,
  markHelpfulSchema,
  reviewQuerySchema,
  storeReviewQuerySchema,
} from "./review.validator";
import {
  CreateReviewHandler,
  GetProductReviewsHandler,
  GetStoreReviewsHandler,
  GetReviewByIdHandler,
  RespondToReviewHandler,
  MarkHelpfulHandler,
  ApproveReviewHandler,
  RejectReviewHandler,
} from "./review.controller";

const router = Router();

router.get(
  "/product/:productId",
  validateRequest(reviewQuerySchema, "query"),
  GetProductReviewsHandler
);

router.get(
  "/store/:storeId",
  authenticate,
  validateRequest(storeReviewQuerySchema, "query"),
  GetStoreReviewsHandler
);

router.get(
  "/:reviewId",
  authenticate,
  GetReviewByIdHandler
);

router.post(
  "/",
  authenticate,
  validateRequest(createReviewSchema),
  CreateReviewHandler
);

router.post(
  "/:reviewId/helpful",
  authenticate,
  validateRequest(markHelpfulSchema),
  MarkHelpfulHandler
);

router.post(
  "/:reviewId/respond",
  authenticate,
  validateRequest(respondToReviewSchema),
  RespondToReviewHandler
);

router.patch(
  "/:reviewId/approve",
  authenticate,
  ApproveReviewHandler
);

router.patch(
  "/:reviewId/reject",
  authenticate,
  RejectReviewHandler
);

export default router;