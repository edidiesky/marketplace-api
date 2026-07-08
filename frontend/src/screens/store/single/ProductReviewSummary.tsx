import { Star } from "lucide-react";

import type { ReviewStats } from "@/types/api";

interface ProductReviewSummaryProps {
  stats: ReviewStats;
  aiHighlights?: string[];
}

const RATING_LEVELS = [5, 4, 3, 2, 1] as const;

export default function ProductReviewSummary({
  stats,
  aiHighlights = [],
}: ProductReviewSummaryProps) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl bold text-[#171717]">Reviews for this item</h2>

      {aiHighlights.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
          <span className="bold text-[#171717]">
            What buyers say, summarized by AI:
          </span>
          {aiHighlights.map((tag) => (
            <span key={tag} className="text-[#444]">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-10">
        <div className="flex flex-col items-start gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-3xl bold text-[#171717]">
              {stats.averageRating.toFixed(1)}
            </span>
            <Star
              size={22}
              className="text-[#e8a33d]"
              fill="currentColor"
              strokeWidth={0}
            />
          </div>
          <span className="text-sm underline underline-offset-4 text-[#171717]">
            Item average ({stats.totalReviews} reviews)
          </span>
        </div>

        <RatingDistribution
          distribution={stats.distribution}
          totalReviews={stats.totalReviews}
        />
      </div>
    </div>
  );
}

function RatingDistribution({
  distribution,
  totalReviews,
}: {
  distribution: Record<string, number>;
  totalReviews: number;
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full max-w-sm">
      {RATING_LEVELS.map((level) => {
        const count = distribution[String(level)] ?? 0;
        const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

        return (
          <div key={level} className="flex items-center gap-3">
            <span className="w-3 text-sm text-[#444] text-right">
              {level}
            </span>
            <Star size={12} className="text-[#e8a33d]" fill="currentColor" strokeWidth={0} />
            <div className="flex-1 h-2 rounded-full bg-[#f4f3ee] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#e8a33d]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-sm text-[#666] text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}