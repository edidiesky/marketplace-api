// routes/review.routes.ts
import { Router } from "express";
import {
  CreateReview,
  GetProductReviews,
  RespondToReview,
  MarkHelpful,
  ApproveReview,
  RejectReview,
} from "../controllers/review.controller";
import { validateRequest } from "../middleware/validate.middleware";
import {
  createReviewSchema,
  respondToReviewSchema,
} from "../validators/review.validation";
import { authenticate, requirePermissions, requireStoreOwner } from "../middleware/auth.middleware";
import { Permission } from "../types";
const router = Router();

// Public route
router.get("/product/:productId", GetProductReviews);

// ALL PROTECTED ROUTES BELOW
router.use(authenticate); // ← MUST COME FIRST!

// Now req.user is guaranteed to exist
router.post("/", validateRequest(createReviewSchema), CreateReview);

router.post("/:reviewId/helpful", MarkHelpful);

router.post(
  "/:reviewId/respond",
  authenticate,
  validateRequest(respondToReviewSchema),
  ()=> RespondToReview
);

router.patch(
  "/:reviewId/approve",
  ApproveReview
);

router.patch(
  "/:reviewId/reject",
  RejectReview
);

export default router;