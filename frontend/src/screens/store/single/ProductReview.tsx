import { useGetProductReviewsQuery } from "@/redux/services/reviewApi";
import type { User } from "@/types/api";
import ProductReviewSummary from "./ProductReviewSummary";
import ProductReviewList from "./ProductReviewList";

type ReviewerInfo = Pick<User, "firstName" | "lastName" | "profileImage">;

interface ProductReviewProps {
  productId: string;
  limit?: number;
  onViewAll?: () => void;
  aiHighlights?: string[];
  usersById?: Record<string, ReviewerInfo>;
}


export default function ProductReview({
  productId,
  limit = 4,
  onViewAll,
  aiHighlights,
  usersById,
}: ProductReviewProps) {
  const { data, isLoading } = useGetProductReviewsQuery(productId, {
    skip: !productId,
  });

  if (isLoading) {
    return <div className="h-64 w-full animate-pulse bg-[#f4f3ee] rounded" />;
  }

  const reviews = data?.data.reviews ?? [];
  const stats = data?.data.stats;

  if (reviews.length === 0 || !stats) return null;

  return (
    <div className="flex flex-col gap-8">
      <ProductReviewSummary stats={stats} aiHighlights={aiHighlights} />
      <ProductReviewList
        reviews={reviews}
        usersById={usersById}
        limit={limit}
        onViewAll={onViewAll}
      />
    </div>
  );
}