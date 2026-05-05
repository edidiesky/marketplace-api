import ReactHtmlParser from "react-html-parser";
import sanitizeHtml from "sanitize-html";
import type { Product } from "@/types/api";

export default function ProductDescription({ product }: { product: Product }) {
  const sanitized = sanitizeHtml(product.description, {
    allowedTags: ["p", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2"],
    allowedAttributes: { a: ["href"] },
    disallowedTagsMode: "discard",
  });

  return (
    <div className="w-full py-12 border-t border-[#f0f0f0]">
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-semibold text-[#171717]">Description</h3>
          <div className="text-sm text-[#666] leading-relaxed font-k_font">
            {ReactHtmlParser(sanitized)}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-semibold text-[#171717]">Additional Information</h3>
          <div className="flex flex-col gap-px">
            {[
              { label: "Category", value: product.category.join(", ") || "—" },
              {
                label: "Colors",
                value: product.colors.length > 0
                  ? product.colors.map((c) => c.name).join(", ")
                  : "—",
              },
              {
                label: "Sizes",
                value: product.size.length > 0
                  ? product.size.map((s) => s.value).join(", ")
                  : "—",
              },
              {
                label: "Availability",
                value: (product.availableStock ?? 0) > 0
                  ? `${product.availableStock} in stock`
                  : "Out of stock",
              },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-2 gap-px">
                <div className="bg-[#f6f6f6] px-4 py-3 text-sm font-semibold text-[#171717]">
                  {row.label}
                </div>
                <div className="bg-[#f6f6f6] px-4 py-3 text-sm text-[#666]">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}