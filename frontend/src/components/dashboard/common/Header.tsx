import React from "react";
import { useSelector } from "react-redux";
import { GoPlus } from "react-icons/go";
import { LuSearch } from "react-icons/lu";
import { RiExternalLinkFill } from "react-icons/ri";
import { IoStorefrontOutline } from "react-icons/io5";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { useNavigate, useParams } from "react-router-dom";
import { useGetMyStoresQuery } from "@/redux/services/storeApi";
import { selectIsAuthenticated } from "@/redux/slices/authSlice";
import type { Store } from "@/types/api";
import { BellDot, ChevronDown, Search } from "lucide-react";
import { BiChevronDown } from "react-icons/bi";

export default function Header() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { id }          = useParams<{ id: string }>();
  const navigate        = useNavigate();
  const [search, setSearch] = React.useState("");

  const { data: myStoreData } = useGetMyStoresQuery(undefined, {
    skip: !isAuthenticated,
  });

  const stores: Store[]  = myStoreData?.data?.stores ?? [];
  const currentStore     = stores.find((s) => (s.storeId ?? s._id) === id) ?? stores[0];
  const currentStoreId   = currentStore?.storeId ?? currentStore?._id ?? id;

  const filteredStores = stores.filter((s: Store) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <header
      style={{ backdropFilter: "blur(54px)" }}
      className="bg-white w-full z-[40] sticky left-0 top-0 flex flex-col items-start border-b"
    >
      {/* top row */}
      <div className="w-full border-b">
        <div className="max-w-[1300px] mx-auto px-4 lg:px-8 min-h-[50px] flex items-center justify-between">
          <button className="flex items-center gap-3 p-2 outline-none">
            <Search size={16} className="text-gray-600" />
            <span className="text-sm text-gray-600">Search or use cmd + k</span>
          </button>
          <button className="flex items-center gap-2 p-2 outline-none">
            <BellDot size={16} className="text-gray-700" />
            <span className="text-sm  text-gray-700">Notifications</span>
          </button>
        </div>
      </div>

      {/* bottom row */}
      <div className="w-full">
        <div className="max-w-[1300px] mx-auto px-4 lg:px-8 min-h-[50px] flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 outline-none transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#004E3F] flex items-center justify-center text-sm  text-white shrink-0">
                  {currentStore?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-base bold truncate max-w-[160px] text-gray-800">
                  {currentStore?.name ?? "Select store"}
                </span>
                <BiChevronDown size={16} className="shrink-0 text-gray-600" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-[240px] border border-gray-300 bg-white rounded-xl p-0 overflow-hidden"
              align="start"
              sideOffset={8}
            >
              {/* search */}
              <div className="px-3 pt-3 pb-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-300">
                  <LuSearch size={13} className="text-gray-600 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search stores..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-sm bg-transparent border-none outline-none text-gray-700 placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* section label */}
              <div className="px-4 pt-1 pb-2">
                <span className="text-[11px] bold text-gray-600 uppercase tracking-widest">
                  My Stores
                </span>
              </div>

              {/* store list */}
              <DropdownMenuRadioGroup value={currentStoreId ?? ""}>
                <div className="px-2 pb-2 flex flex-col gap-0.5">
                  {filteredStores.map((store: Store) => {
                    const sid      = store.storeId ?? store._id ?? "";
                    const isActive = sid === currentStoreId;
                    return (
                      <DropdownMenuRadioItem
                        key={sid}
                        value={sid}
                        className="cursor-pointer rounded-lg px-3 py-2.5 outline-none transition-colors data-[highlighted]:bg-gray-50"
                        style={{
                          backgroundColor: isActive ? "#f0fdf4" : undefined,
                        }}
                        onSelect={() => navigate(`/dashboard/store/${sid}`)}
                      >
                        <div className="flex items-center justify-between w-full gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: isActive ? "#004E3F" : "#f3f4f6",
                              }}
                            >
                              <IoStorefrontOutline
                                fontSize="14px"
                                style={{ color: isActive ? "#fff" : "#6b7280" }}
                              />
                            </div>
                            <span
                              className="text-sm bold truncate max-w-[140px]"
                            >
                              {store.name}
                            </span>
                          </div>
                          <a
                            href={
                              import.meta.env.PROD
                                ? `https://${store.subdomain}.selleasi.com`
                                : `/store/${sid}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
                            title="View store"
                          >
                            <RiExternalLinkFill size={15} className="text-gray-600" />
                          </a>
                        </div>
                      </DropdownMenuRadioItem>
                    );
                  })}
                </div>

                {/* divider + create */}
                <div className="border-t border-gray-100 px-2 py-2">
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 text-sm  text-gray-600 hover:bg-gray-50 hover:text-gray-900 outline-none transition-colors"
                    onSelect={() => navigate("/onboarding/create-store")}
                  >
                  
                    Create Store
                  </DropdownMenuItem>
                </div>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* create button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center rounded-full gap-2 bg-[var(--dark-1)] text-white text-sm  px-4 py-2 hover:opacity-90 outline-none transition-opacity"
              >
                <GoPlus fontSize="18px" />
                Create
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[190px] border border-gray-100 bg-white shadow-lg rounded-xl p-2 flex flex-col gap-0.5"
              align="end"
              sideOffset={8}
            >
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-3 py-2.5 flex items-center gap-2.5 text-sm text-gray-700 hover:bg-gray-50 outline-none transition-colors"
                onSelect={() => navigate(`/dashboard/store/${currentStoreId}/products`)}
              >
                
                Add product
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-3 py-2.5 flex items-center gap-2.5 text-sm text-gray-700 hover:bg-gray-50 outline-none transition-colors"
                onSelect={() => navigate(`/dashboard/store/${currentStoreId}/orders`)}
              >
                
                New order
              </DropdownMenuItem>
              <div className="h-px bg-gray-100 mx-1 my-1" />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-3 py-2.5 flex items-center gap-2.5 text-sm text-gray-700 hover:bg-gray-50 outline-none transition-colors"
                onSelect={() => navigate("/onboarding/create-store")}
              >
                
                New store
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}