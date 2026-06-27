import { useParams } from "react-router-dom";
import { HiOutlineChevronRight } from "react-icons/hi2";
import { ImSearch } from "react-icons/im";
import ProductCard from "@/components/store/common/ProductCard";
import CardLoader from "@/components/common/loader/CardLoader";
import { useGetAllStoreProductsQuery } from "@/redux/services/productApi";
import { useGetStoreQuery } from "@/redux/services/storeApi";
import type { Product } from "@/types/api";
import { useState } from "react";


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
 
  // derive categories from actual product data
  const categories = Array.from(
    new Set(allProducts.flatMap((p) => p.category ?? []))
  ).filter(Boolean);
 
  const filtered = allProducts.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !activeCategory ||
      (p.category ?? []).includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full max-w-custom mx-auto flex flex-col">
      <div className="w-full h-[320px] relative">
        <img
          src="https://avada.website/retail/wp-content/uploads/sites/113/2021/02/banner-11-scaled.jpg"
          alt="banner_cover"
          className="w-full absolute top-0 left-0 object-cover z-10 h-full"
        />
        <div className="w-full absolute top-0 left-0 h-full bg-[rgba(0,0,0,.3)] z-10" />
        <div className="w-full max-w-7xl mx-auto h-full p-4 lg:p-8 flex z-30 relative items-center">
          <h2 className="text-4xl lg:text-6xl text-white font-semibold">
            {store?.name}'s Shop
            {store?.description && (
            <span className="mt-3 block text-white/70 text-sm lg:text-base max-w-[560px] leading-relaxed">
              {store.description}
            </span>
          )}
          <div className="mt-5 flex items-center gap-3">
            <span className="text-base text-white/50 font-medium">
              {allProducts.length} product{allProducts.length !== 1 ? "s" : ""}
            </span>
            {store?.subdomain && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-base text-white/50">
                  {store.subdomain}.selleasi.com
                </span>
              </>
            )}
          </div>
          </h2>
        </div>
      </div>

      <div className="w-full px-4 md:px-4 grid gap-12 py-12 items-start lg:grid-cols-[1fr_300px]">
        {isLoading ? (
          <div className="w-full grid sm:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-8">
            {Array.from({ length: 7 }).map((_, index) => (
              <CardLoader key={index} />
            ))}
          </div>
        ) : (
          <div className="w-full grid sm:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-8">
            {allProducts?.map((product: Product) => (
              <ProductCard product={product} key={product._id} />
            ))}
          </div>
        )}

        <div className="w-full">
          <div className="w-full flex flex-col p-3 gap-10">
            <label
              htmlFor="search"
              className="w-full h-[60px] p-3 border rounded-md text-base flex items-center gap-3"
            >
              <ImSearch />
              <input
                type="text"
                placeholder="Search ...."
                id="search"
                className="border-none outline-none bg-transparent text-sm w-full"
              />
            </label>

            <div className="w-full flex flex-col gap-2">
              <h4 className="text-xl font-medium">Categories</h4>
              <div className="w-full flex flex-col">
                {categories.map((category) => (
                  <div
                    key={category}
                    className="w-full cursor-pointer py-4 text-sm border-b"
                  >
                    <h5
                      className="w-full hover:translate-x-2 transition-transform flex items-center gap-1"
                    >
                      <HiOutlineChevronRight />
                      {category}
                    </h5>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}