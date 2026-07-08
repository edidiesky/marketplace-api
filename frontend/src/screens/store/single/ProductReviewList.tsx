import { Star, HelpCircle } from "lucide-react";
import type { Review, User } from "@/types/api";

type ReviewerInfo = Pick<User, "firstName" | "lastName" | "profileImage">;

interface ProductReviewListProps {
  reviews: Review[];
  usersById?: Record<string, ReviewerInfo>;
  onViewAll?: () => void;
  onWhyTheseReviews?: () => void;
  limit?: number;
}

export default function ProductReviewList({
  reviews,
  usersById = {},
  onViewAll,
  onWhyTheseReviews,
  limit,
}: ProductReviewListProps) {
  const visible = limit ? reviews.slice(0, limit) : reviews;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-black/10">
        {visible.map((review) => (
          <ReviewCard
            key={review._id}
            review={review}
            reviewer={usersById[review.userId]}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-6">
        <button
          onClick={onWhyTheseReviews}
          className="flex items-center gap-1.5 text-sm text-[#666] underline underline-offset-4 hover:text-[#171717] transition-colors"
        >
          Why these reviews?
          <HelpCircle size={14} />
        </button>

        <button
          onClick={onViewAll}
          className="rounded-full border border-black/10 px-6 py-3 text-sm bold text-[#171717] hover:bg-[#f4f3ee] transition-colors"
        >
          View all reviews for this item
        </button>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  reviewer,
}: {
  review: Review;
  reviewer?: ReviewerInfo;
}) {
  const displayName = reviewer
    ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(" ") ||
      "Verified buyer"
    : "Verified buyer";

  const formattedDate = new Date(review.createdAt).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );

  return (
    <div className="flex flex-col gap-2 py-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[#e8a33d]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={14}
              fill={i < review.rating ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-[#666]">
          {reviewer?.profileImage && (
            <img
              src={reviewer.profileImage}
              alt=""
              className="w-5 h-5 rounded-full object-cover shrink-0"
            />
          )}
          <span className="bold text-[#171717]">{displayName}</span>
          <span aria-hidden>|</span>
          <span>{formattedDate}</span>
        </div>
      </div>

      <p className="text-sm text-[#171717] leading-relaxed">
        {review.comment}
      </p>

      {review.sellerResponse && (
        <div className="mt-1 rounded-lg bg-[#f4f3ee] p-3 text-sm text-[#444]">
          <span className="bold text-[#171717]">Seller response: </span>
          {review.sellerResponse}
        </div>
      )}

      {review.helpfulCount > 0 && (
        <span className="text-xs text-[#666]">
          {review.helpfulCount} people found this helpful
        </span>
      )}
    </div>
  );
}