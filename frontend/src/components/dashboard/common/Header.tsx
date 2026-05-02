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
import { useGetAllStoresQuery, useGetStoreQuery } from "@/redux/services/storeApi";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import type { Store } from "@/types/api";
import { BellDot, ChevronDown, Search } from "lucide-react";
import { BiChevronDown } from "react-icons/bi";

export default function Header() {
  const currentUser = useSelector(selectCurrentUser);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");

  const { data: storesData } = useGetAllStoresQuery({}, { skip: !currentUser });
  const { data: singleStoreData } = useGetStoreQuery(id ?? "", { skip: !id });

  const stores = storesData?.data ?? [];
  const singleStore = singleStoreData?.data;

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
            <Search size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400">Search or use cmd + k</span>
          </button>
          <button className="flex items-center gap-2 p-2 outline-none">
            <BellDot size={16} className="text-gray-700" />
            <span className="text-sm font-semibold text-gray-700">Notifications</span>
          </button>
        </div>
      </div>

      {/* bottom row */}
      <div className="w-full">
        <div className="max-w-[1300px] mx-auto px-4 lg:px-8 min-h-[50px] flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-2 outline-none">
                <div className="w-5 h-5 bg-[#004E3F] flex items-center justify-center text-xs text-white shrink-0">
                  {singleStore?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm truncate max-w-[160px]">
                  {singleStore?.name ?? "Select store"}
                </span>
                <BiChevronDown size={16} className="shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[220px] border bg-white rounded-none" align="start">
              <DropdownMenuRadioGroup value={id ?? ""}>
                <div className="p-2.5 border-b flex items-center gap-2">
                  <LuSearch size={13} className="text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder="Search store"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-sm border-none outline-none"
                  />
                </div>
                <div className="py-2 px-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">My Stores</span>
                </div>
                {filteredStores.map((store: Store) => (
                  <DropdownMenuRadioItem
                    key={store._id}
                    value={store._id}
                    className="cursor-pointer hover:bg-[#F3F3EE] gap-2 rounded-none"
                    onSelect={() => navigate(`/dashboard/store/${store._id}`)}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex text-sm font-medium items-center gap-2">
                        <IoStorefrontOutline fontSize="16px" />
                        <span className="truncate max-w-[140px]">{store.name}</span>
                      </div>
                      <RiExternalLinkFill className="text-muted-foreground shrink-0" />
                    </div>
                  </DropdownMenuRadioItem>
                ))}
                <DropdownMenuItem
                  className="hover:bg-[#F3F3EE] cursor-pointer border mx-2 mb-2 flex items-center justify-center gap-1 text-sm rounded-none"
                  onSelect={() => navigate("/onboarding")}
                >
                  <GoPlus />
                  Create Store
                </DropdownMenuItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                style={{ transition: "all .15s" }}
                className="flex items-center gap-2 bg-[var(--dark-1)] text-white text-sm font-semibold px-4 py-2 hover:opacity-90 outline-none"
              >
                <GoPlus fontSize="18px" />
                Create
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[180px] border bg-white rounded-none" align="end">
              <DropdownMenuItem
                className="cursor-pointer hover:bg-[#F3F3EE] gap-2 text-sm rounded-none"
                onSelect={() => navigate(`/dashboard/store/${id}/products`)}
              >
                <GoPlus fontSize="14px" />
                Add product
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer hover:bg-[#F3F3EE] gap-2 text-sm rounded-none"
                onSelect={() => navigate(`/dashboard/store/${id}/orders`)}
              >
                <GoPlus fontSize="14px" />
                New order
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer hover:bg-[#F3F3EE] gap-2 text-sm rounded-none"
                onSelect={() => navigate("/onboarding")}
              >
                <GoPlus fontSize="14px" />
                New store
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}