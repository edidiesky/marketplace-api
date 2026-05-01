// src/components/store/common/Header.tsx
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ShoppingCart } from "lucide-react";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { useGetStoreQuery } from "@/redux/services/storeApi";
import { useGetUserCartQuery } from "@/redux/services/cartApi";

export default function StoreHeader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const { data: storeData } = useGetStoreQuery(id ?? "", { skip: !id });
  const { data: cartData } = useGetUserCartQuery(id ?? "", {
    skip: !id || !currentUser,
  });

  const store = storeData?.data;
  const cartCount = cartData?.data?.items?.length ?? 0;

  return (
    <header className="w-full sticky top-0 z-50 border-b bg-white/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        <Link
          to={`/store/${id}`}
          className="text-lg font-bold tracking-tight text-[#171717]"
        >
          {store?.name ?? "Store"}
        </Link>

        <div className="flex items-center gap-4">
          {currentUser ? (
            <button
              onClick={() =>
                navigate(`/store/${id}/cart/${cartData?.data?._id ?? ""}`)
              }
              className="relative flex items-center gap-2 h-10 px-4 rounded-full border border-black/10 text-sm font-medium hover:bg-[#f4f3ee] transition-colors"
            >
              <ShoppingCart size={16} />
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#171717] text-white text-xs flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() =>
                navigate("/login", {
                  state: { from: { pathname: `/store/${id}` } },
                })
              }
              className="h-10 px-4 rounded-full bg-[#171717] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}