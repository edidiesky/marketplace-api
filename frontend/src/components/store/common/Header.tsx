import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ShoppingCart, Heart, Search, User } from "lucide-react";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { useGetStoreQuery } from "@/redux/services/storeApi";
import { useGetUserCartQuery } from "@/redux/services/cartApi";
import { useState } from "react";
import { Product } from "@/types/api";
import { useGetAllStoreProductsQuery } from "@/redux/services/productApi";

export default function StoreHeader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [search, setSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);

  const { data: storeData } = useGetStoreQuery(id ?? "", { skip: !id });
  const { data: cartData } = useGetUserCartQuery(id ?? "", {
    skip: !id || !currentUser,
  });
  const { data: productsData } = useGetAllStoreProductsQuery(
    { storeid: id ?? "", limit: 200 },
    { skip: !id },
  );

  const store = storeData?.data;
  const cartCount = cartData?.data?.items?.length ?? 0;

  // derive categories from actual products
  const allProducts: Product[] = productsData?.data?.products ?? [];

  const categories = Array.from(
    new Set(allProducts.flatMap((p) => p.category ?? [])),
  )
    .filter(Boolean)
    .sort();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/store/${id}?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleCategoryClick = (cat: string) => {
    setCatOpen(false);
    navigate(`/store/${id}?category=${encodeURIComponent(cat)}`);
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-[#FAF8F5] border-b border-[#e8e6e3]">
      {/* main row */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-[138px] flex items-start py-6 gap-4">
        {/* left — store name */}
        <Link
          to={`/store/${id}`}
          className="text-2xl pt-4 bold text-[#171717] whitespace-nowrap shrink-0"
        >
          {store?.name ?? "Store"}
        </Link>
        <div className="flex w-full pb-4 flex-col gap-2">
          <div className="w-full">
            <form
              onSubmit={handleSearch}
              className="w-full flex items-center border border-[#c8c6c2] overflow-hidden h-[52px] rounded-full"
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${store?.name ?? "this store"}...`}
                className="flex-1 h-full px-4 text-base bold text-[#222] placeholder:text-[#aaa] outline-none bg-transparent"
              />
              <button
                type="submit"
                className="h-full aspect-square flex items-center justify-center bg-[#E56000] hover:bg-[#cc5500] transition-colors shrink-0"
                aria-label="Search"
              >
                <Search size={17} className="text-white" />
              </button>
            </form>
          </div>
          <div className="flex justify-center items-center gap-4">
            {categories.map((cat, i) => (
              <button
                key={`${cat}-${i}`}
                onClick={() => handleCategoryClick(cat)}
                className={`flex items-center gap-2 h-[42px] px-3 bold rounded-full text-base text-[#333] hover:bg-[#eeece2] transition-colors`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex pt-4 items-center gap-4 shrink-0">
          {currentUser ? (
            <>
              {/* account */}
              <button
                onClick={() => navigate(`/store/${id}/profile`)}
                className="flex flex-col items-center gap-0.5 p-3 rounded-full hover:bg-[#eeece2] transition-colors group"
                title={currentUser.name?.split(" ")[0] ?? "Account"}
              >
                <User
                  size={20}
                  className="text-[#333] group-hover:text-[#171717]"
                />
              </button>

              {/* favourites placeholder */}
              <button
                className="flex flex-col items-center gap-0.5 p-3 rounded-full hover:bg-[#eeece2] transition-colors group"
                title="Favorites"
              >
                <Heart
                  size={20}
                  className="text-[#333] group-hover:text-[#171717]"
                />
              </button>

              {/* cart */}
              <button
                onClick={() => {
                  const cartId = cartData?.data?.cartId ?? cartData?.data?._id;
                  if (cartId) navigate(`/store/${id}/cart/${cartId}`);
                }}
                className="relative flex flex-col items-center gap-0.5 p-3 rounded-full hover:bg-[#eeece2] transition-colors group"
                title="Cart"
              >
                <div className="relative">
                  <ShoppingCart
                    size={20}
                    className="text-[#333] group-hover:text-[#171717]"
                  />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#E56000] text-white text-[9px]  flex items-center justify-center rounded-full">
                      {cartCount}
                    </span>
                  )}
                </div>
              </button>
            </>
          ) : (
            <>
              {/* sign in */}
              <button
                onClick={() =>
                  navigate("/login", {
                    state: { from: { pathname: `/store/${id}` } },
                  })
                }
                className="flex flex-col items-center gap-0.5 p-3 rounded-full hover:bg-[#eeece2] transition-colors group"
              >
                <User size={20} className="text-[#333]" />
              </button>

              {/* favourites */}
              <button
                onClick={() =>
                  navigate("/login", {
                    state: { from: { pathname: `/store/${id}` } },
                  })
                }
                className="flex flex-col items-center gap-0.5 p-3 rounded-full hover:bg-[#eeece2] transition-colors group"
              >
                <Heart size={20} className="text-[#333]" />
              </button>

              {/* cart */}
              <button
                onClick={() =>
                  navigate("/login", {
                    state: { from: { pathname: `/store/${id}` } },
                  })
                }
                className="flex flex-col items-center gap-0.5 p-3 rounded-full hover:bg-[#eeece2] transition-colors group"
              >
                <ShoppingCart size={20} className="text-[#333]" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
