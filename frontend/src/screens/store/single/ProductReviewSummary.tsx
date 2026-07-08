// import { Star } from "lucide-react";

// import type { ReviewStats } from "@/types/api";

// interface ProductReviewSummaryProps {
//   stats: ReviewStats;
//   aiHighlights?: string[];
// }

// const RATING_LEVELS = [5, 4, 3, 2, 1] as const;

// export default function ProductReviewSummary({
//   stats,
//   aiHighlights = [],
// }: ProductReviewSummaryProps) {
//   return (
//     <div className="flex flex-col gap-6">
//       <h2 className="text-2xl bold text-[#171717]">Reviews for this item</h2>

//       {aiHighlights.length > 0 && (
//         <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
//           <span className="bold text-[#171717]">
//             What buyers say, summarized by AI:
//           </span>
//           {aiHighlights.map((tag) => (
//             <span key={tag} className="text-[#444]">
//               {tag}
//             </span>
//           ))}
//         </div>
//       )}

//       <div className="flex flex-wrap items-start gap-10">
//         <div className="flex flex-col items-start gap-1 shrink-0">
//           <div className="flex items-center gap-2">
//             <span className="text-3xl bold text-[#171717]">
//               {stats.averageRating.toFixed(1)}
//             </span>
//             <Star
//               size={22}
//               className="text-[#e8a33d]"
//               fill="currentColor"
//               strokeWidth={0}
//             />
//           </div>
//           <span className="text-sm underline underline-offset-4 text-[#171717]">
//             Item average ({stats.totalReviews} reviews)
//           </span>
//         </div>

//         <RatingDistribution
//           distribution={stats.distribution}
//           totalReviews={stats.totalReviews}
//         />
//       </div>
//     </div>
//   );
// }

// function RatingDistribution({
//   distribution,
//   totalReviews,
// }: {
//   distribution: Record<string, number>;
//   totalReviews: number;
// }) {
//   return (
//     <div className="flex flex-col gap-1.5 w-full max-w-sm">
//       {RATING_LEVELS.map((level) => {
//         const count = distribution[String(level)] ?? 0;
//         const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

//         return (
//           <div key={level} className="flex items-center gap-3">
//             <span className="w-3 text-sm text-[#444] text-right">
//               {level}
//             </span>
//             <Star size={12} className="text-[#e8a33d]" fill="currentColor" strokeWidth={0} />
//             <div className="flex-1 h-2 rounded-full bg-[#f4f3ee] overflow-hidden">
//               <div
//                 className="h-full rounded-full bg-[#e8a33d]"
//                 style={{ width: `${pct}%` }}
//               />
//             </div>
//             <span className="w-8 text-sm text-[#666] text-right">
//               {count}
//             </span>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

import { mockAiSummary, mockRatingBreakdown } from "@/mocks/sampleReviewData";
import { Star, Check } from "lucide-react";

function RatingRing({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value / 5));
  const circumference = 2 * Math.PI * 18;
  const dash = circumference * pct;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 44 44" className="h-20 w-20 -rotate-90">
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="#EDEAE3"
            strokeWidth="3"
          />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="#F5A623"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-base lg:text-lg bold text-[#171717]">
          {value.toFixed(1)}
        </div>
      </div>
      <span className="text-sm text-[#666] text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

export default function ProductReviewSummary() {
  const {
    overall,
    totalReviews,
    quality,
    shipping,
    customerService,
    recommendPercent,
  } = mockRatingBreakdown;

  return (
    <div className="w-full flex flex-col gap-6">
      <h3 className="text-lg lg:text-2xl bold">Reviews for this item</h3>
      <div className="w-full flex flex-col gap-4">
        <p className="text-base lg:text-lg bold">
          What buyers say, summarized by AI:
        </p>
        <div className="flex flex-wrap gap-2">
          {mockAiSummary.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 rounded-full border border-[#EDEAE3] px-3 py-1 text-sm lg:text-base text-[#171717]"
            >
              <Check size={12} className="text-[#2F5D4F]" />
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-8">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl lg:text-6xl bold text-[#171717]">
              {overall.toFixed(1)}
            </span>
            <Star size={22} className="fill-[#F5A623] text-[#F5A623]" />
          </div>
          <span className="text-sm text-[#666]">
            Item average{" "}
            <span className="underline">({totalReviews} reviews)</span>
          </span>
        </div>

        <div className="flex gap-6">
          <RatingRing value={quality} label="Item quality" />
          <RatingRing value={shipping} label="Shipping" />
          <RatingRing value={customerService} label={"Customer\nservice"} />
        </div>

        <div className="flex flex-col items-center gap-1 rounded-full border-2 border-[#F5A623] h-20 w-20 justify-center">
          <span className="text-base lg:text-lg bold text-[#171717]">
            {recommendPercent}%
          </span>
        </div>
        <span className="text-sm text-[#666] -ml-4 max-w-[70px]">
          Buyers recommend
        </span>
      </div>
    </div>
  );
}
