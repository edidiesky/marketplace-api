import sanitizeHtml from "sanitize-html";
import ReactHtmlParser from "react-html-parser";
import { Heart, Minus, Plus } from "lucide-react";
import type { Product } from "@/types/api";
import { useState } from "react";

interface ProductPricePanelProps {
  product: Product;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onAddToCart: () => void;
  addingToCart: boolean;
  reviewsCount: number;
  onViewReviews: () => void;
}

export default function ProductPricePanel({
  product,
  quantity,
  onIncrement,
  onDecrement,
  onAddToCart,
  addingToCart,
  reviewsCount,
  onViewReviews,
}: ProductPricePanelProps) {
  const sanitizedValue = sanitizeHtml(
    product.description?.slice(0, 100) ?? "",
    {
      allowedTags: ["p", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2"],
      allowedAttributes: {
        a: ["href"],
      },
      disallowedTagsMode: "discard",
    },
  );

  const [saved, setSaved] = useState(false);

  const handleToggleSaved = () => {
    const next = !saved;
    setSaved(next);
  };

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="w-full flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <h4 className="text-lg bold text-red-600">10+ views in 24 Hours</h4>
          <h1 className="text-4xl lg:text-5xl text-[#171717]">
            ₦{product.price.toLocaleString("en-NG")}
          </h1>
        </div>

        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-2">
            <h4 className="text-base bold text-gray-600">
              Local taxes included (where applicable)
            </h4>
            <p className="text-xl text-[#171717]">{product.name}</p>
            <p className="text-base text-[#171717] leading-relaxed">
              {ReactHtmlParser(sanitizedValue)}
            </p>
          </div>

          {product.colors?.length > 0 && (
            <div className="flex w-full flex-col gap-2">
              <span className="text-lg bold text-[#171717]">
                Colors Available
              </span>
              <div className="flex items-center gap-2">
                {product.colors.map((c, i) => (
                  <div
                    key={i}
                    style={{ backgroundColor: c.value }}
                    className="w-10 h-10 rounded-full border border-black/10 cursor-pointer hover:scale-110 transition-transform"
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {product.size?.length > 0 && (
            <div className="flex w-full flex-col gap-2">
              <span className="text-lg bold text-[#171717]">Sizes</span>
              <div className="flex items-center gap-2">
                {product.size.map((s, i) => (
                  <div
                    key={i}
                    className="px-3 bold py-1.5 border border-black/10 text-base text-[#171717] cursor-pointer hover:bg-[#f4f3ee] transition-colors"
                  >
                    {s.value}
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.category?.length > 0 && (
            <div className="flex w-full flex-wrap gap-2">
              {product.category.map((cat) => (
                <span
                  key={cat}
                  className="px-3 bold py-1 bg-[#f4f3ee] text-base text-[#444]"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
          {/* sizes */}
          <div className="flex w-full items-center rounded-full border justify-between border-black/10 overflow-hidden">
            <button
              onClick={onDecrement}
              className="w-12 h-12 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors"
            >
              <Minus size={18} />
            </button>
            <span className="w-12 text-center text-base bold">{quantity}</span>
            <button
              onClick={onIncrement}
              className="w-12 h-12 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          {/* cart btn */}
          <button
            onClick={onAddToCart}
            disabled={addingToCart}
            style={{
              height:"56px"
            }}
            className="w-full h-14 bg-[#171717] text-white text-base bold rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {addingToCart ? "Adding..." : "Add to Cart"}
          </button>
          {/* favorites btn */}
          <button
            onClick={handleToggleSaved}
             style={{
              height:"56px"
            }}
            className="w-full h-14 border bg-white text-dark text-base bold rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Heart
              size={18}
              className={saved ? "text-red-600" : "text-[#171717]"}
              fill={saved ? "currentColor" : "none"}
            />
            {saved ? "Saved to collection" : "Add to collection"}
          </button>
        </div>

        <button
          onClick={onViewReviews}
          className="text-sm text-[#666] underline underline-offset-4 text-left w-fit hover:text-[#171717] transition-colors"
        >
          View all {reviewsCount} reviews
        </button>
      </div>
    </div>
  );
}
