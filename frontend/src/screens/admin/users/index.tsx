import { useState } from "react";
import { useGetAllUsersQuery, useDeleteUserMutation } from "@/redux/services/userApi";
import type { User } from "@/types/api";
import toast from "react-hot-toast";

const ROWS_PER_PAGE = 10;

type UserType = User["userType"];

const userTypeConfig: Record<UserType, { label: string; className: string }> = {
  BUYER:  { label: "Buyer",  className: "bg-blue-50 text-blue-700"        },
  SELLER: { label: "Seller", className: "bg-[#fbe1d1] text-[#5d2a1a]"    },
  ADMIN:  { label: "Admin",  className: "bg-[#17191c] text-white"         },
};

export default function AdminUsers() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<UserType | "">("");

  const { data: usersResponse, isLoading } = useGetAllUsersQuery({
    page: currentPage,
    limit: ROWS_PER_PAGE,
    userType: typeFilter || undefined,
  });

  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const users: User[] = usersResponse?.data ?? [];
  const total = usersResponse?.pagination?.total ?? 0;
  const totalPages = usersResponse?.pagination?.totalPages ?? 1;

  const filtered = users.filter((u) =>
    [u.firstName, u.lastName, u.email, u.phone].some((v) =>
      String(v ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await deleteUser(id).unwrap();
      toast.success(`${name} deleted.`);
    } catch {
      toast.error("Failed to delete user.");
    }
  };

  return (
    <div className="w-full  p-4 py-8 lg:p-12 mx-auto">
      <div className="w-full flex flex-col gap-8">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-xl lg:text-2xl font-selleasy_bold text-[#17191c]">Users</h4>
            <p className="text-sm font-selleasy_normal text-[#64645f] mt-1 max-w-[420px]">
              View and manage all platform users — buyers, sellers, and admins.
            </p>
          </div>
          <span className="text-xs text-[#a3a6af] font-selleasy_normal mt-2">{total} total</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search users..."
            className="w-48 lg:w-64 px-4 h-[38px] bg-white border border-[#e8e6e3] text-sm font-selleasy_normal outline-none focus:border-[#17191c] transition-colors"
          />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as UserType | ""); setCurrentPage(1); }}
            className="h-[38px] px-3 border border-[#e8e6e3] text-sm font-selleasy_normal bg-white outline-none focus:border-[#17191c] transition-colors"
          >
            <option value="">All types</option>
            <option value="BUYER">Buyers</option>
            <option value="SELLER">Sellers</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>

        <div className="border border-[#e8e6e3] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e6e3]">
                {["Name", "Email", "Phone", "Type", "Verified", "Joined", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#a3a6af] uppercase tracking-widest whitespace-nowrap font-dashboard_regular">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">Loading users...</td></tr>
              ) : filtered.length > 0 ? filtered.map((user) => {
                const cfg = userTypeConfig[user.userType];
                return (
                  <tr key={user._id} className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {user.profileImage ? (
                          <img src={user.profileImage} alt="avatar" className="w-7 h-7 object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 bg-[#17191c] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            {user.firstName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-semibold text-[#17191c] font-dashboard_regular">{user.firstName} {user.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#4c4c4c] font-selleasy_normal whitespace-nowrap">{user.email}</td>
                    <td className="px-5 py-3 text-[#4c4c4c] font-selleasy_normal whitespace-nowrap">{user.phone ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 ${cfg.className}`}>{cfg.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 ${user.isEmailVerified ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-800"}`}>
                        {user.isEmailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#777b86] font-selleasy_normal whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleDelete(user._id, `${user.firstName} ${user.lastName}`)}
                        disabled={deleting}
                        className="text-xs font-semibold text-red-600 hover:underline font-dashboard_regular"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">No users found{search ? ` for "${search}"` : ""}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#a3a6af] font-selleasy_normal">Page {currentPage} of {totalPages} — {total} users</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-3 text-xs font-semibold border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] font-dashboard_regular">Prev</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`h-8 w-8 text-xs font-semibold border font-dashboard_regular ${currentPage === page ? "bg-[var(--dark-1)] text-white border-[var(--dark-1)]" : "border-[#e8e6e3] text-[#4c4c4c] hover:bg-[#f2f0ed]"}`}>{page}</button>
            ))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 px-3 text-xs font-semibold border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] font-dashboard_regular">Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}