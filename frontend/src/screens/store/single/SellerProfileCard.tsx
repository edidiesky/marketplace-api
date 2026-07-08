import { useGetStoreQuery } from "@/redux/services/storeApi";
import { Store as StoreIcon } from "lucide-react";

interface SellerProfileCardProps {
  storeId: string;
}

export default function SellerProfileCard({ storeId }: SellerProfileCardProps) {
  const { data, isLoading } = useGetStoreQuery(storeId, { skip: !storeId });
  const store = data?.data;

  if (isLoading || !store) return null;

  const location = [store.address?.["city"], store.address?.["country"]]
    .filter(Boolean)
    .join(", ");

  const memberSinceYear = new Date(store.createdAt).getFullYear();

  return (
    <div className="w-full py-8 border-t border-[#f0f0f0] flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-[#f4f3ee] overflow-hidden flex items-center justify-center shrink-0">
        {store.logo ? (
          <img
            src={store.logo}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <StoreIcon size={24} className="text-[#999]" />
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-lg text-[#171717]">{store.name}</span>
        {location && <span className="text-sm text-[#666]">{location}</span>}
        <span className="text-xs text-[#999]">
          Selling since {memberSinceYear}
        </span>
      </div>
    </div>
  );
}