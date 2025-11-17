import { ReviewRepository } from "../repositories/ReviewRepository";
import { ReviewService } from "./review.service";

const ReviewRepo = new ReviewRepository();
export const reviewService = new ReviewService(ReviewRepo);
