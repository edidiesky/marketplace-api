import { useGetAllStoreProductsQuery } from "@/redux/services/productApi";
import { useNavigate, useParams } from "react-router-dom";
import type { Product } from "@/types/api";

export default function MoreFromThisShop({ currentProductId }: { currentProductId: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: productsResponse } = useGetAllStoreProductsQuery(
    { storeid: id ?? "", limit: 6 },
    { skip: !id }
  );

  const products: Product[] = (productsResponse?.data?.products ?? [])
    .filter((p) => (p.productId ?? p._id) !== currentProductId)
    .slice(0, 4);

  if (products.length === 0) return null;

  return (
    <div className="w-full py-12 border-t border-[#f0f0f0] flex flex-col gap-6">
      <h3 className="text-xl text-[#171717]">More From This Shop</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const pid = product.productId ?? product._id ?? "";
          return (
            <button
              key={pid}
              onClick={() => navigate(`/store/${id}/product/${pid}`)}
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
                  <div className="w-full h-full flex items-center justify-center text-[#aaa] text-xs">
                    No image
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-[#171717] truncate">{product.name}</p>
                <p className="text-sm text-[#666] mt-0.5">
                  ₦{product.price.toLocaleString("en-NG")}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}