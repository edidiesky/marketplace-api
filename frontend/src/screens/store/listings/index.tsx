import { useState } from "react";
import { useParams } from "react-router-dom";
import { Search } from "lucide-react";
import ProductCard from "@/components/store/common/ProductCard";
import CardLoader from "@/components/common/loader/CardLoader";
import { useGetAllStoreProductsQuery } from "@/redux/services/productApi";
import { useGetStoreQuery } from "@/redux/services/storeApi";
import type { Product } from "@/types/api";
import LazyImage from "@/components/common/LazyImage";

export default function StoreListing() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch]           = useState("");
  const [activeCategory, setCategory] = useState<string | null>(null);

  const { data: storeProductData, isLoading } = useGetAllStoreProductsQuery(
    { storeid: id ?? "" },
    { skip: !id }
  );
  const { data: storeData } = useGetStoreQuery(id ?? "", { skip: !id });

  const allProducts: Product[] = storeProductData?.data?.products ?? [];
  const store = storeData?.data;

  const categories = Array.from(
    new Set(allProducts.flatMap((p) => p.category ?? []))
  ).filter(Boolean);

  const filtered = allProducts.filter((p) => {
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !activeCategory || (p.category ?? []).includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full">
      {/* hero */}
      <div className="w-full h-[320px] relative overflow-hidden">
        <LazyImage
          src={
            store?.logo ??
            "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80"
          }
          alt="store banner"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        <div className="absolute inset-0 flex flex-col justify-end px-6 lg:px-16 pb-10 max-w-screen-2xl mx-auto">
          <p className="text-[11px]  text-white/50 uppercase tracking-widest mb-2">
            Welcome to
          </p>
          <h1 className="text-3xl lg:text-5xl  text-white leading-tight">
            {store?.name ?? "Store"}
          </h1>
          {store?.description && (
            <p className="mt-2 text-white/60 text-sm max-w-[500px] leading-relaxed">
              {store.description}
            </p>
          )}
          <p className="mt-3 text-sm text-white/40">
            {allProducts.length} product{allProducts.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* body */}
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-10">

        {/* controls row */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          {/* category pills */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategory(null)}
              className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
                !activeCategory
                  ? "bg-[#222] text-white border-[#222]"
                  : "border-[#e0ddd8] text-[#555] hover:border-[#222]"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(activeCategory === cat ? null : cat)}
                className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
                  activeCategory === cat
                    ? "bg-[#222] text-white border-[#222]"
                    : "border-[#e0ddd8] text-[#555] hover:border-[#222]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* search */}
          <div className="flex items-center gap-2 border border-[#e0ddd8] px-3 h-9 focus-within:border-[#222] transition-colors min-w-[200px]">
            <Search size={13} className="text-[#aaa] shrink-0" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-[#222] placeholder:text-[#aaa]"
            />
          </div>
        </div>

        {/* result count */}
        <p className="text-sm text-[#999] mb-6">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          {activeCategory ? ` in "${activeCategory}"` : ""}
          {search ? ` for "${search}"` : ""}
        </p>

        {/* grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {Array.from({ length: 10 }).map((_, i) => <CardLoader key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {filtered.map((product) => (
              <ProductCard
                product={product}
                key={product.productId ?? product._id}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-[#aaa]">
              {search || activeCategory
                ? "No products match your filter."
                : "This store has no products yet."}
            </p>
            {(search || activeCategory) && (
              <button
                onClick={() => { setSearch(""); setCategory(null); }}
                className="text-sm underline text-[#555] hover:text-[#222]"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}