import { Link, useParams } from "react-router-dom";
import {  ShoppingCart } from "lucide-react";
import type { Product } from "@/types/api";
import { FiStar } from "react-icons/fi";

export default function ProductCard({ product }: { product: Product }) {
  const { id: storeId } = useParams<{ id: string }>();
  const pid = product.productId ?? product._id ?? "";
  const originalPrice = Math.round(product.price * 1.15);

  return (
    <Link
      to={`/store/${storeId}/product/${pid}`}
      className="w-full flex flex-col group gap-3"
    >
      <div
        className="w-full h-[300px] rounded-xl overflow-hidden bg-[#f5f4f0]"
        style={{ aspectRatio: "3/4" }}
      >
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart size={24} className="text-[#ccc]" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-base text-[#222] leading-[1.4] line-clamp-2 ">
          {product.name}
        </h3>

        {/* stars */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <FiStar
              key={i}
              size={17}
              className="fill-[#000] text-[#000]"
            />
          ))}
          <span className="text-base text-[#999]">
            (10)
          </span>
        </div>

        {/* price row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg bold">
            NGN {product.price.toLocaleString("en-NG")}
          </span>
          <span className="text-base text-[#999] line-through">
            ₦{originalPrice.toLocaleString("en-NG")} 
          </span>
        </div>
      </div>
    </Link>
  );
}
