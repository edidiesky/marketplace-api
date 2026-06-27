import sanitizeHtml from "sanitize-html";
import type { Product } from "@/types/api";

const SANITIZE_CONFIG = {
  allowedTags:       ["p", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2", "br"],
  allowedAttributes: { a: ["href"] },
  disallowedTagsMode: "discard" as const,
};

export default function ProductDescription({ product }: { product: Product }) {
  const sanitized = product.description
    ? sanitizeHtml(product.description, SANITIZE_CONFIG)
    : "";

  return (
    <div className="w-full py-12 border-t border-[#f0f0f0]">
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="flex flex-col gap-4">
          <h3 className="text-xl text-[#171717]">Description</h3>
          {sanitized ? (
            <div
              className="text-sm text-[#666] leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
          ) : (
            <p className="text-sm text-[#aaa]">No description provided.</p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-xl text-[#171717]">Additional Information</h3>
          <div className="flex flex-col gap-px">
            {[
              {
                label: "Category",
                value: (product.category ?? []).join(", ") || "—",
              },
              {
                label: "Colors",
                value: (product.colors ?? []).length > 0
                  ? (product.colors ?? []).map((c) => c.name).join(", ")
                  : "—",
              },
              {
                label: "Sizes",
                value: (product.size ?? []).length > 0
                  ? (product.size ?? []).map((s) => s.name).join(", ")
                  : "—",
              },
              {
                label: "Availability",
                value: (product.availableStock ?? 0) > 0
                  ? `${product.availableStock} in stock`
                  : "In stock",
              },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-2 gap-px">
                <div className="bg-[#f6f6f6] px-4 py-3 text-sm  text-[#171717]">
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