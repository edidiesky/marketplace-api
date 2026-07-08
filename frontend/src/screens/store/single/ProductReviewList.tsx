// import { Star, HelpCircle } from "lucide-react";
// import type { Review, User } from "@/types/api";

// type ReviewerInfo = Pick<User, "firstName" | "lastName" | "profileImage">;

// interface ProductReviewListProps {
//   reviews: Review[];
//   usersById?: Record<string, ReviewerInfo>;
//   onViewAll?: () => void;
//   onWhyTheseReviews?: () => void;
//   limit?: number;
// }

// export default function ProductReviewList({
//   reviews,
//   usersById = {},
//   onViewAll,
//   onWhyTheseReviews,
//   limit,
// }: ProductReviewListProps) {
//   const visible = limit ? reviews.slice(0, limit) : reviews;

//   return (
//     <div className="flex flex-col">
//       <div className="flex flex-col divide-y divide-black/10">
//         {visible.map((review) => (
//           <ReviewCard
//             key={review._id}
//             review={review}
//             reviewer={usersById[review.userId]}
//           />
//         ))}
//       </div>

//       <div className="flex items-center justify-between pt-6">
//         <button
//           onClick={onWhyTheseReviews}
//           className="flex items-center gap-1.5 text-sm text-[#666] underline underline-offset-4 hover:text-[#171717] transition-colors"
//         >
//           Why these reviews?
//           <HelpCircle size={14} />
//         </button>

//         <button
//           onClick={onViewAll}
//           className="rounded-full border border-black/10 px-6 py-3 text-sm bold text-[#171717] hover:bg-[#f4f3ee] transition-colors"
//         >
//           View all reviews for this item
//         </button>
//       </div>
//     </div>
//   );
// }

// function ReviewCard({
//   review,
//   reviewer,
// }: {
//   review: Review;
//   reviewer?: ReviewerInfo;
// }) {
//   const displayName = reviewer
//     ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(" ") ||
//       "Verified buyer"
//     : "Verified buyer";

//   const formattedDate = new Date(review.createdAt).toLocaleDateString(
//     "en-US",
//     { month: "short", day: "numeric", year: "numeric" },
//   );

//   return (
//     <div className="flex flex-col gap-2 py-5">
//       <div className="flex flex-wrap items-center justify-between gap-2">
//         <div className="flex items-center gap-1 text-[#e8a33d]">
//           {Array.from({ length: 5 }).map((_, i) => (
//             <Star
//               key={i}
//               size={14}
//               fill={i < review.rating ? "currentColor" : "none"}
//               strokeWidth={1.5}
//             />
//           ))}
//         </div>

//         <div className="flex items-center gap-2 text-sm text-[#666]">
//           {reviewer?.profileImage && (
//             <img
//               src={reviewer.profileImage}
//               alt=""
//               className="w-5 h-5 rounded-full object-cover shrink-0"
//             />
//           )}
//           <span className="bold text-[#171717]">{displayName}</span>
//           <span aria-hidden>|</span>
//           <span>{formattedDate}</span>
//         </div>
//       </div>

//       <p className="text-sm text-[#171717] leading-relaxed">
//         {review.comment}
//       </p>

//       {review.sellerResponse && (
//         <div className="mt-1 rounded-lg bg-[#f4f3ee] p-3 text-sm text-[#444]">
//           <span className="bold text-[#171717]">Seller response: </span>
//           {review.sellerResponse}
//         </div>
//       )}

//       {review.helpfulCount > 0 && (
//         <span className="text-xs text-[#666]">
//           {review.helpfulCount} people found this helpful
//         </span>
//       )}
//     </div>
//   );
// }

import { useState } from "react";
import { Star, ThumbsUp, ShieldCheck } from "lucide-react";
import {
  mockReviews,
  mockReviewTagCounts,
  type MockReview,
  type ReviewTag,
} from "@/mocks/sampleReviewData";

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? "fill-[#F5A623] text-[#F5A623]" : "fill-[#EDEAE3] text-[#EDEAE3]"}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: MockReview }) {
  const initial = review.reviewerName.charAt(0).toUpperCase();
  const date = new Date(review.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="py-5 border-b border-[#EDEAE3] last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center text-white text-base lg:text-lg bold shrink-0"
            style={{ backgroundColor: review.reviewerAvatarColor }}
          >
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Stars rating={review.rating} />
              <span className="text-base lg:text-lg bold">{review.reviewerName}</span>
            </div>
            {review.purchaseMeta && (
              <p className="text-sm text-[#666] mt-0.5">{review.purchaseMeta}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm lg:text-base text-[#2F5D4F] shrink-0">
          <ShieldCheck size={14} />
          Recommends
        </div>
      </div>

      <p className="text-base lg:text-lg text-[#171717] mt-3 leading-relaxed">{review.comment}</p>

      <div className="flex items-center justify-between mt-3">
        <span className="text-sm lg:text-base text-[#666]">{date}</span>
        {review.helpfulCount > 0 && (
          <button className="flex items-center gap-1 text-sm text-[#666] hover:text-[#171717] transition-colors">
            <ThumbsUp size={12} />
            Helpful ({review.helpfulCount})
          </button>
        )}
      </div>
    </div>
  );
}

interface ProductReviewListProps {
  /** Cap the number of reviews shown, e.g. 3 for an inline preview. Omit to show all. */
  limit?: number;
}

export default function ProductReviewList({ limit }: ProductReviewListProps) {
  const [activeTag, setActiveTag] = useState<ReviewTag | "Suggested">("Suggested");

  const filtered =
    activeTag === "Suggested" ? mockReviews : mockReviews.filter((r) => r.tag === activeTag);
  const visible = limit ? filtered.slice(0, limit) : filtered;

  return (
    <div className="w-full flex flex-col gap-4 lg:gap-10">
      <div className="flex items-center gap-2 flex-wrap ">
        <button
          onClick={() => setActiveTag("Suggested")}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-sm lg:text-base bold transition-colors ${
            activeTag === "Suggested"
              ? "border-[#171717] bg-[#171717] text-white"
              : "border-[#EDEAE3] text-[#171717] hover:border-[#171717]"
          }`}
        >
          Suggested
        </button>
        {mockReviewTagCounts.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm bold whitespace-nowrap transition-colors ${
              activeTag === tag
                ? "border-[#171717] bg-[#171717] text-white"
                : "border-[#EDEAE3] text-[#171717] hover:border-[#171717]"
            }`}
          >
            {tag} ({count})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-[#666] py-6">No reviews match this filter yet.</p>
      ) : (
        <div className="flex flex-col">
          {visible.map((review) => (
            <ReviewCard key={review._id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}