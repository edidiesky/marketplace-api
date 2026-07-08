import { Package, MapPin } from "lucide-react";
import type { Product } from "@/types/api";
import { useGetStoreQuery } from "@/redux/services/storeApi";

interface ProductShippingInfoProps {
  product: Product;
  storeId: string;
}

export default function ProductShippingInfo({
  product,
  storeId,
}: ProductShippingInfoProps) {
  const { data } = useGetStoreQuery(storeId, { skip: !storeId });
  const store = data?.data;

  const location = [store?.address?.["city"], store?.address?.["country"]]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="w-full py-8 border-t border-[#f0f0f0] flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Package size={20} className="text-[#666] mt-0.5 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm bold text-[#171717]">Availability</span>
          <span className="text-sm text-[#666]">
            {(product.availableStock ?? 0) > 0
              ? `${product.availableStock} in stock`
              : "In stock"}
          </span>
        </div>
      </div>

      {location && (
        <div className="flex items-start gap-3">
          <MapPin size={20} className="text-[#666] mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm bold text-[#171717]">Ships from</span>
            <span className="text-sm text-[#666]">{location}</span>
          </div>
        </div>
      )}

      {/*
        TODO once storeSettings carries real shipping config:
        - Cost to ship: shipping cost is per-store, needs a
          storeSettings.shippingCost or per-product override field
        - Ships out within: needs a storeSettings.processingDays field
        - Returns & exchanges: needs a storeSettings.returnPolicy field
      */}
    </div>
  );
}