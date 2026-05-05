import { useState } from "react";
import { Star } from "lucide-react";
import { useGetProductReviewsQuery, useCreateReviewMutation } from "@/redux/services/reviewApi";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import toast from "react-hot-toast";
import type { Review } from "@/types/api";

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i + 1)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={16}
            className={i < value ? "text-amber-400 fill-amber-400" : "text-[#ddd]"}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductReview({ productId }: { productId: string }) {
  const currentUser = useSelector(selectCurrentUser);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: reviewData, isLoading } = useGetProductReviewsQuery(productId, { skip: !productId });
  const [createReview, { isLoading: submitting }] = useCreateReviewMutation();

  const reviews: Review[] = reviewData?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await createReview({ productId, rating, comment }).unwrap();
      toast.success("Review submitted!");
      setComment("");
      setRating(5);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  return (
    <div className="w-full py-12 border-t border-[#f0f0f0] flex flex-col gap-8">
      <h3 className="text-xl font-semibold text-[#171717]">
        Customer Reviews ({reviews.length})
      </h3>

      {isLoading ? (
        <p className="text-sm text-[#666]">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-[#666]">No reviews yet. Be the first to leave one.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {reviews.map((review) => (
            <div key={review._id} className="flex flex-col gap-2 pb-6 border-b border-[#f0f0f0] last:border-0">
              <div className="flex items-center justify-between gap-4">
                <StarRating value={review.rating} />
                <span className="text-xs text-[#aaa]">
                  {new Date(review.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <p className="text-sm text-[#444] leading-relaxed">{review.comment}</p>
              {review.sellerResponse && (
                <div className="bg-[#f6f6f6] px-4 py-3 text-sm text-[#666] border-l-2 border-[#171717]">
                  <span className="text-xs font-semibold text-[#171717] block mb-1">Seller response</span>
                  {review.sellerResponse}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {currentUser && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
          <h4 className="text-base font-semibold text-[#171717]">Write a review</h4>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#171717]">Your rating</span>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#171717]">Your review</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Share your experience with this product..."
              className="border border-black/10 px-4 py-3 text-sm text-[#171717] outline-none focus:border-[#171717] transition-colors resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !comment.trim()}
            className="h-11 bg-[#171717] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 w-fit px-6"
          >
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </form>
      )}
    </div>
  );
}