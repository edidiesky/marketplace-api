import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ShoppingCart, Heart, Search, User } from "lucide-react";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { useGetStoreQuery } from "@/redux/services/storeApi";
import { useGetUserCartQuery } from "@/redux/services/cartApi";
import { useState } from "react";

export default function StoreHeader() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [search, setSearch] = useState("");

  const { data: storeData } = useGetStoreQuery(id ?? "", { skip: !id });
  const { data: cartData  } = useGetUserCartQuery(id ?? "", {
    skip: !id || !currentUser,
  });

  const store     = storeData?.data;
  const cartCount = cartData?.data?.items?.length ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/store/${id}?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-white border-b border-[#e8e6e3]">
      {/* main row */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-[68px] flex items-center gap-4">

        {/* left — store name */}
        <Link
          to={`/store/${id}`}
          className="text-base font-semibold text-[#171717] whitespace-nowrap shrink-0"
        >
          {store?.name ?? "Store"}
        </Link>

        {/* center — search bar */}
        <form
          onSubmit={handleSearch}
          className="flex-1 flex items-center border border-[#c8c6c2] overflow-hidden max-w-2xl mx-auto h-[42px]"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${store?.name ?? "this store"}...`}
            className="flex-1 h-full px-4 text-sm text-[#222] placeholder:text-[#aaa] outline-none bg-transparent"
          />
          <button
            type="submit"
            className="h-full aspect-square flex items-center justify-center bg-[#E56000] hover:bg-[#cc5500] transition-colors shrink-0"
            aria-label="Search"
          >
            <Search size={17} className="text-white" />
          </button>
        </form>

        {/* right — actions */}
        <div className="flex items-center gap-1 shrink-0">
          {currentUser ? (
            <>
              {/* account */}
              <button
                onClick={() => navigate(`/store/${id}/profile`)}
                className="flex flex-col items-center gap-0.5 px-3 py-2 hover:bg-[#f5f4f0] transition-colors group"
                title={currentUser.name?.split(" ")[0] ?? "Account"}
              >
                <User size={20} className="text-[#333] group-hover:text-[#171717]" />
                <span className="text-[10px] text-[#555] leading-none">
                  {currentUser.name?.split(" ")[0] ?? "Account"}
                </span>
              </button>

              {/* favourites placeholder */}
              <button
                className="flex flex-col items-center gap-0.5 px-3 py-2 hover:bg-[#f5f4f0] transition-colors group"
                title="Favorites"
              >
                <Heart size={20} className="text-[#333] group-hover:text-[#171717]" />
                <span className="text-[10px] text-[#555] leading-none">Favorites</span>
              </button>

              {/* cart */}
              <button
                onClick={() => {
                  const cartId = cartData?.data?._id;
                  if (cartId) navigate(`/store/${id}/cart/${cartId}`);
                }}
                className="relative flex flex-col items-center gap-0.5 px-3 py-2 hover:bg-[#f5f4f0] transition-colors group"
                title="Cart"
              >
                <div className="relative">
                  <ShoppingCart size={20} className="text-[#333] group-hover:text-[#171717]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#E56000] text-white text-[9px] font-bold flex items-center justify-center rounded-full">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#555] leading-none">Cart</span>
              </button>
            </>
          ) : (
            <>
              {/* sign in */}
              <button
                onClick={() => navigate("/login", { state: { from: { pathname: `/store/${id}` } } })}
                className="flex flex-col items-center gap-0.5 px-3 py-2 hover:bg-[#f5f4f0] transition-colors group"
              >
                <User size={20} className="text-[#333]" />
                <span className="text-[10px] text-[#555] leading-none">Sign in</span>
              </button>

              {/* favourites */}
              <button
                onClick={() => navigate("/login", { state: { from: { pathname: `/store/${id}` } } })}
                className="flex flex-col items-center gap-0.5 px-3 py-2 hover:bg-[#f5f4f0] transition-colors group"
              >
                <Heart size={20} className="text-[#333]" />
                <span className="text-[10px] text-[#555] leading-none">Favorites</span>
              </button>

              {/* cart */}
              <button
                onClick={() => navigate("/login", { state: { from: { pathname: `/store/${id}` } } })}
                className="flex flex-col items-center gap-0.5 px-3 py-2 hover:bg-[#f5f4f0] transition-colors group"
              >
                <ShoppingCart size={20} className="text-[#333]" />
                <span className="text-[10px] text-[#555] leading-none">Cart</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}