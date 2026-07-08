import { useState } from "react";
import { Star } from "lucide-react";
import { useCreateReviewMutation } from "@/redux/services/reviewApi";
import toast from "react-hot-toast";

interface ReviewSubmitFormProps {
  productId: string;
}

function EditableStarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button key={i} type="button" onClick={() => onChange(i + 1)}>
          <Star
            size={16}
            className={i < value ? "text-amber-400 fill-amber-400" : "text-[#ddd]"}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewSubmitForm({ productId }: ReviewSubmitFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [createReview, { isLoading: submitting }] = useCreateReviewMutation();

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
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) =>
        toast.error(m)
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
      <h4 className="text-base text-[#171717]">Write a review</h4>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-[#171717]">Your rating</span>
        <EditableStarRating value={rating} onChange={setRating} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-[#171717]">Your review</span>
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
        className="h-11 bg-[#171717] text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50 w-fit px-6"
      >
        {submitting ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}