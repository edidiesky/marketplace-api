
import { Link } from "react-router-dom";
import { ShoppingCart, Star } from "lucide-react";
import type { Product } from "@/types/api";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/store/${product.store}/product/${product._id}`}
      className="w-full flex flex-col group rounded-xl border border-black/5 overflow-hidden hover:shadow-md transition-shadow bg-white"
    >
      <div className="w-full aspect-square overflow-hidden bg-[#f4f3ee]">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#aaa] text-sm">
            No image
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-[#171717] line-clamp-1">
          {product.name}
        </h4>

        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={12}
              className="text-amber-400 fill-amber-400"
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-base font-bold text-[#171717]">
            ₦{product.price.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-xs text-[#666] hover:text-[#171717] transition-colors">
            <ShoppingCart size={14} />
            Add to cart
          </span>
        </div>
      </div>
    </Link>
  );
}