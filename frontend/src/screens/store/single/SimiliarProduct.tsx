import React from "react";
import ProductCard from "@/components/store/common/ProductCard";
import { productDataList } from "@/constants/data";
export default function SimiliarProduct() {
  return (
    <div className="w-full grid py-12 gap-12">
      <div className="w-full">
        {/* product description */}
        <div className="w-full flex flex-col gap-6">
          <h3 className="text-2xl">You Might Also Like</h3>
          <div className="w-full grid sm:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-8">
            {productDataList?.slice(0, 4).map((data, index) => {
              return <ProductCard product={data} key={index} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
