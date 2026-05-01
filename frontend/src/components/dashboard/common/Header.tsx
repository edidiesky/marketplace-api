import React from "react";
import { useSelector } from "react-redux";
import { LiaArrowsAltVSolid } from "react-icons/lia";
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
import {  useNavigate, useParams } from "react-router-dom";
import { useGetAllStoresQuery, useGetStoreQuery } from "@/redux/services/storeApi";
import UserProfile from "@/components/common/UserProfile";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import type { Store } from "@/types/api";

export default function Header() {
  const currentUser = useSelector(selectCurrentUser);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");

  const { data: storesData } = useGetAllStoresQuery(
    {},
    { skip: !currentUser }
  );
  const { data: singleStoreData } = useGetStoreQuery(id ?? "", {
    skip: !id,
  });

  const stores = storesData?.data ?? [];
  const singleStore = singleStoreData?.data;

  const filteredStores = stores.filter((s: Store) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <header
      style={{ backdropFilter: "blur(54px)" }}
      className="bg-transparent w-full z-[40] border-b min-h-[75px] sticky left-0 top-0 flex items-center"
    >
      <div className="px-4 w-full lg:px-8">
        <div className="flex w-full items-center justify-between">
          <div className="flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex max-w-[280px] p-3 py-2 border rounded-full hover:bg-[#F3F3EE] items-center gap-4 justify-between outline-none">
                  <div className="flex items-center gap-2">
                    <div className="w-[30px] h-[30px] flex bg-[#004E3F] items-center text-sm text-white justify-center rounded-full shrink-0">
                      {singleStore?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-xs md:text-sm truncate max-w-[160px]">
                      {singleStore?.name ?? "Select store"}
                    </span>
                  </div>
                  <LiaArrowsAltVSolid className="text-sm lg:text-lg shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-[260px] border bg-white">
                <DropdownMenuRadioGroup value={id ?? ""}>
                  <div className="w-full my-1 p-2.5 gap-2 text-lg border-b flex items-center">
                    <LuSearch className="shrink-0 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search store"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full text-sm bg-transparent border-none outline-none"
                    />
                  </div>

                  <div className="w-full py-2 px-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      My Stores
                    </span>
                  </div>

                  {filteredStores.map((store: Store) => (
                    <DropdownMenuRadioItem
                      key={store._id}
                      value={store._id}
                      className="w-full cursor-pointer py-2 hover:bg-[#F3F3EE] gap-2"
                      onSelect={() =>
                        navigate(`/dashboard/store/${store._id}`)
                      }
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="flex text-sm font-medium items-center gap-2">
                          <IoStorefrontOutline fontSize="18px" />
                          <span className="truncate max-w-[160px]">
                            {store.name}
                          </span>
                        </div>
                        <RiExternalLinkFill className="shrink-0 text-muted-foreground" />
                      </div>
                    </DropdownMenuRadioItem>
                  ))}

                  <DropdownMenuItem
                    className="w-full my-2 p-2 hover:bg-[#F3F3EE] cursor-pointer border rounded-xl flex items-center justify-center gap-1 text-sm"
                    onSelect={() => navigate("/onboarding")}
                  >
                    <GoPlus />
                    Create Store
                  </DropdownMenuItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-1 justify-end items-center gap-2">
            <UserProfile />
          </div>
        </div>
      </div>
    </header>
  );
}