import { useState } from "react";
import { useGetAllUsersQuery } from "@/redux/services/userApi";
import type { User } from "@/types/api";
import { Input } from "@/components/ui/input";

const ROWS_PER_PAGE = 10;

export default function Customers() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data: usersResponse, isLoading } = useGetAllUsersQuery({
    userType: "BUYER",
    page: currentPage,
    limit: ROWS_PER_PAGE,
  });

  const users: User[] = usersResponse?.data ?? [];
  const total = usersResponse?.pagination?.total ?? 0;
  const totalPages = usersResponse?.pagination?.totalPages ?? 1;

  const filtered = users.filter((u) =>
    [u.firstName, u.lastName, u.email, u.phone].some((val) =>
      String(val ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="w-full p-4 py-8 lg:p-12 mx-auto">
      <div className="w-full flex flex-col gap-8">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-xl lg:text-2xl text-[#17191c]">Customers</h4>
            <p className="text-sm text-[#64645f] mt-1 max-w-[420px]">
              View all buyers who have interacted with your store.
            </p>
          </div>
          <span className="text-xs text-[#a3a6af] mt-2">{total} total</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search customers..."
            className="w-48 lg:w-64 px-4 h-[38px] bg-white border border-[#e8e6e3] text-sm outline-none focus:border-[#17191c] transition-colors"
          />
          <span className="text-xs text-[#a3a6af] ">{filtered.length} shown</span>
        </div>

        <div className="border border-[#e8e6e3] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e6e3]">
                {["Name", "Email", "Phone", "Type", "Verified", "Joined"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs  text-[#a3a6af] uppercase  whitespace-nowrap ">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#a3a6af] ">
                    Loading customers...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((user) => (
                  <tr key={user._id} className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {user.profileImage ? (
                          <img src={user.profileImage} alt="avatar" className="w-7 h-7 object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 bg-[#17191c] flex items-center justify-center text-white text-xs  flex-shrink-0">
                            {user.firstName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm  text-[#17191c] ">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#4c4c4c] whitespace-nowrap">{user.email}</td>
                    <td className="px-5 py-3 text-[#4c4c4c] whitespace-nowrap">{user.phone ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs  px-2 py-0.5 bg-[#f2f0ed] text-[#4c4c4c]">
                        {user.userType}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs  px-2 py-0.5 ${user.isEmailVerified ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-800"}`}>
                        {user.isEmailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#777b86] whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#a3a6af] ">
                    No customers found{search ? ` for "${search}"` : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#a3a6af] ">Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-3 text-xs  border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] ">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`h-8 w-8 text-xs  border ${currentPage === page ? "bg-[var(--dark-1)] text-white border-[var(--dark-1)]" : "border-[#e8e6e3] text-[#4c4c4c] hover:bg-[#f2f0ed]"}`}>{page}</button>
            ))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 px-3 text-xs  border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] ">Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}