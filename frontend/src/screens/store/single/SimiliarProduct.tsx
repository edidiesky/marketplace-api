import { useGetAllStoreProductsQuery } from "@/redux/services/productApi";
import { useNavigate, useParams } from "react-router-dom";
import type { Product } from "@/types/api";

export default function SimilarProduct({ currentProductId }: { currentProductId: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: productsResponse } = useGetAllStoreProductsQuery(
    { storeid: id!, limit: 5 },
    { skip: !id }
  );

  const products: Product[] = (productsResponse?.data ?? []).filter(
    (p) => p._id !== currentProductId
  ).slice(0, 4);

  if (products.length === 0) return null;

  return (
    <div className="w-full py-12 border-t border-[#f0f0f0] flex flex-col gap-6">
      <h3 className="text-xl font-semibold text-[#171717]">You Might Also Like</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <button
            key={product._id}
            onClick={() => navigate(`/store/${id}/product/${product._id}`)}
            className="flex flex-col gap-3 text-left group"
          >
            <div className="w-full aspect-square bg-[#f4f3ee] overflow-hidden">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#aaa] text-xs">No image</div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#171717] truncate">{product.name}</p>
              <p className="text-sm text-[#666] mt-0.5">₦{product.price.toLocaleString("en-NG")}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}