// import { useGetProductReviewsQuery } from "@/redux/services/reviewApi";
// import type { User } from "@/types/api";
// import ProductReviewSummary from "./ProductReviewSummary";
// import ProductReviewList from "./ProductReviewList";

// type ReviewerInfo = Pick<User, "firstName" | "lastName" | "profileImage">;

// interface ProductReviewProps {
//   productId: string;
//   limit?: number;
//   onViewAll?: () => void;
//   aiHighlights?: string[];
//   usersById?: Record<string, ReviewerInfo>;
// }


// export default function ProductReview({
//   productId,
//   limit = 4,
//   onViewAll,
//   aiHighlights,
//   usersById,
// }: ProductReviewProps) {
//   const { data, isLoading } = useGetProductReviewsQuery(productId, {
//     skip: !productId,
//   });

//   if (isLoading) {
//     return <div className="h-64 w-full animate-pulse bg-[#f4f3ee] rounded" />;
//   }

//   const reviews = data?.data.reviews ?? [];
//   const stats = data?.data.stats;

//   if (reviews.length === 0 || !stats) return null;

//   return (
//     <div className="flex flex-col gap-8">
//       <ProductReviewSummary stats={stats} aiHighlights={aiHighlights} />
//       <ProductReviewList
//         reviews={reviews}
//         usersById={usersById}
//         limit={limit}
//         onViewAll={onViewAll}
//       />
//     </div>
//   );
// }

import ProductReviewSummary from "./ProductReviewSummary";
import ProductReviewList from "./ProductReviewList";

interface ProductReviewProps {
  productId: string;
  onViewAll: () => void;
}

// NOTE: mocked for now — swap the two child components over to
// useGetProductReviewsQuery(productId) once the review list endpoint
// returns AI-summary tags + rating rings. productId is accepted here
// so that wiring is a one-line change later.
export default function ProductReview({ _productId, onViewAll }: ProductReviewProps) {
  return (
    <div className="w-full flex flex-col gap-6 lg:gap-14">
      <ProductReviewSummary />
      <ProductReviewList limit={3} />
      <div className="w-full flex items-center justify-center">
        <button
        onClick={onViewAll}
        className="border rounded-full p-4 py-2 text-base border-[#000] bold text-[#171717]"
      >
        View all reviews for this item
      </button>
      </div>
    </div>
  );
}