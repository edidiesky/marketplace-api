// import { useGetStoreQuery } from "@/redux/services/storeApi";
// import { Store as StoreIcon } from "lucide-react";

// interface SellerProfileCardProps {
//   storeId: string;
// }

// export default function SellerProfileCard({ storeId }: SellerProfileCardProps) {
//   const { data, isLoading } = useGetStoreQuery(storeId, { skip: !storeId });
//   const store = data?.data;

//   if (isLoading || !store) return null;

//   const location = [store.address?.["city"], store.address?.["country"]]
//     .filter(Boolean)
//     .join(", ");

//   const memberSinceYear = new Date(store.createdAt).getFullYear();

//   return (
//     <div className="w-full py-8 border-t border-[#f0f0f0] flex items-center gap-4">
//       <div className="w-16 h-16 rounded-full bg-[#f4f3ee] overflow-hidden flex items-center justify-center shrink-0">
//         {store.logo ? (
//           <img
//             src={store.logo}
//             alt={store.name}
//             className="w-full h-full object-cover"
//           />
//         ) : (
//           <StoreIcon size={24} className="text-[#999]" />
//         )}
//       </div>
//       <div className="flex flex-col gap-0.5">
//         <span className="text-lg text-[#171717]">{store.name}</span>
//         {location && <span className="text-sm text-[#666]">{location}</span>}
//         <span className="text-sm lg:text-base text-[#999]">
//           Selling since {memberSinceYear}
//         </span>
//       </div>
//     </div>
//   );
// }

import { useState } from "react";
import { Star, Truck, Mail, Award, ChevronRight, ChevronLeft, Heart } from "lucide-react";
import { mockShop } from "@/mocks/sampleReviewData";

const BADGE_ICONS = {
  shipping: Truck,
  replies: Mail,
  reviews: Award,
} as const;

interface SellerProfileCardProps {
  onMessageSeller?: () => void;
  onFollowShop?: () => void;
  onVisitShop?: () => void;
}

export default function SellerProfileCard({
  onMessageSeller,
  onFollowShop,
  onVisitShop,
}: SellerProfileCardProps) {
  const [reviewIndex, setReviewIndex] = useState(0);
  const shop = mockShop;
  const initial = shop.name.charAt(0).toUpperCase();

  const salesLabel =
    shop.salesCount >= 1000 ? `${(shop.salesCount / 1000).toFixed(1)}k sales` : `${shop.salesCount} sales`;

  const activeReview = shop.recentReviews[reviewIndex];
  const canGoNext = reviewIndex < shop.recentReviews.length - 1;
  const canGoPrev = reviewIndex > 0;

  return (
    <div className="w-full rounded-xl border border-[#EDEAE3] bg-white p-6 flex flex-col gap-8 lg:gap-14">
      {/* Header: avatar, name, follow/message */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center text-white text-xl lg:text-3xl bold shrink-0"
            style={{ backgroundColor: shop.avatarColor }}
          >
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl lg:text-2xl bold text-[#171717]">{shop.name}</span>
              <button
                onClick={onVisitShop}
                className="text-sm lg:text-base text-[#666] underline hover:text-[#171717] transition-colors"
              >
                {shop.handle}
              </button>
            </div>
            <p className="text-sm lg:text-base text-[#666] mt-0.5">{shop.location}</p>
            <div className="flex items-center gap-1 mt-1 text-sm lg:text-base text-[#171717]">
              <Star size={12} className="fill-[#F5A623] text-[#F5A623]" />
              <span className="bold">{shop.rating}</span>
              <span className="text-[#666]">
                ({shop.reviewCount}) · {salesLabel} · {shop.yearsOnPlatform} years on Etsy
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={onFollowShop}
            className="flex items-center gap-2 rounded-full border border-[#EDEAE3] px-6 py-2 text-sm lg:text-base bold text-[#171717] hover:border-[#171717] transition-colors"
          >
            <Heart size={13} />
            Follow shop
          </button>
          <button
            onClick={onMessageSeller}
            className="rounded-full bg-[#171717] px-6 py-2 text-sm lg:text-base bold text-white hover:bg-[#333] transition-colors"
          >
            Message seller
          </button>
        </div>
      </div>
      <p className="text-sm lg:text-base text-[#666] -mt-4">Typically responds within {shop.respondsWithin}</p>

      {/* Trust badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 pt-4 border-t border-[#EDEAE3]">
        {shop.badges.map((badge) => {
          const Icon = BADGE_ICONS[badge.icon];
          return (
            <div key={badge.title} className="flex flex-col gap-4">
              <Icon size={26} className="text-[#171717]" />
              <p className="text-sm lg:text-base text-[#171717]">
                <span className="bold">{badge.title}</span> {badge.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mini review carousel */}
      <div className="pt-4 border-t border-[#EDEAE3]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base lg:text-lg bold text-[#171717]">
            All reviews from this shop ({shop.reviewCount})
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
              disabled={!canGoPrev}
              className="h-7 w-7 flex items-center justify-center rounded-full border border-[#EDEAE3] text-[#171717] disabled:opacity-30 hover:border-[#171717] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setReviewIndex((i) => Math.min(shop.recentReviews.length - 1, i + 1))}
              disabled={!canGoNext}
              className="h-7 w-7 flex items-center justify-center rounded-full border border-[#EDEAE3] text-[#171717] disabled:opacity-30 hover:border-[#171717] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-[#EDEAE3] p-4">
          <div className="flex items-center gap-0.5 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={18}
                className={
                  i < activeReview.rating
                    ? "fill-[#F5A623] text-[#F5A623]"
                    : "fill-[#EDEAE3] text-[#EDEAE3]"
                }
              />
            ))}
          </div>
          <p className="text-sm lg:text-base text-[#171717] leading-relaxed line-clamp-3">{activeReview.comment}</p>
          <p className="text-sm lg:text-base text-[#666] mt-3">
            {activeReview.reviewerName} ·{" "}
            {new Date(activeReview.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <p className="text-sm lg:text-base text-[#666]">
            Purchased: <span className="underline">{activeReview.purchasedFor}</span>
          </p>
        </div>
      </div>

      {/* More from this shop */}
      <div className="pt-4 border-t border-[#EDEAE3]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base lg:text-lg bold text-[#171717]">More from this shop</p>
          <button
            onClick={onVisitShop}
            className="text-sm lg:text-base text-[#666] underline hover:text-[#171717] transition-colors"
          >
            Visit shop
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {shop.otherProducts.map((product) => (
            <div key={product.id} className="flex flex-col gap-2">
              <div
                className="aspect-square rounded-lg"
                style={{ backgroundColor: product.imageColor }}
              />
              <p className="text-sm lg:text-base text-[#666] truncate">{product.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}