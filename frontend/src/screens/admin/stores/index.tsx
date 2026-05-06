import { useState } from "react";
import { useGetAllStoresQuery, useDeleteStoreMutation, useUpdateStoreMutation } from "@/redux/services/storeApi";
import type { Store } from "@/types/api";
import toast from "react-hot-toast";

const ROWS_PER_PAGE = 10;

export default function AdminStores() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data: storesResponse, isLoading } = useGetAllStoresQuery({ page: currentPage, limit: ROWS_PER_PAGE });
  const [deleteStore, { isLoading: deleting }] = useDeleteStoreMutation();
  const [updateStore] = useUpdateStoreMutation();

  const stores: Store[] = storesResponse?.data ?? [];
  const total = storesResponse?.pagination?.total ?? 0;
  const totalPages = storesResponse?.pagination?.totalPages ?? 1;

  const filtered = stores.filter((s) =>
    [s.name, s.subdomain, s.plan].some((v) =>
      String(v ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete store "${name}"? This cannot be undone.`)) return;
    try {
      await deleteStore(id).unwrap();
      toast.success(`${name} deleted.`);
    } catch {
      toast.error("Failed to delete store.");
    }
  };

  const handleToggleActive = async (store: Store) => {
    try {
      await updateStore({ id: store._id, name: store.name }).unwrap();
      toast.success(`Store updated.`);
    } catch {
      toast.error("Failed to update store.");
    }
  };

  return (
    <div className="w-full p-4 py-8 lg:p-12 mx-auto">
      <div className="w-full flex flex-col gap-8">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-xl lg:text-2xl font-selleasy_bold text-[#17191c]">Stores</h4>
            <p className="text-sm font-selleasy_normal text-[#64645f] mt-1 max-w-[420px]">
              View and manage all seller stores on the platform.
            </p>
          </div>
          <span className="text-xs text-[#a3a6af] font-selleasy_normal mt-2">{total} total</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search stores..."
            className="w-48 lg:w-64 px-4 h-[38px] bg-white border border-[#e8e6e3] text-sm font-selleasy_normal outline-none focus:border-[#17191c] transition-colors"
          />
          <span className="text-xs text-[#a3a6af] font-selleasy_normal">{filtered.length} shown</span>
        </div>

        <div className="border border-[#e8e6e3] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e6e3]">
                {["Name", "Subdomain", "Plan", "Status", "Created", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#a3a6af] uppercase tracking-widest whitespace-nowrap font-dashboard_regular">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">Loading stores...</td></tr>
              ) : filtered.length > 0 ? filtered.map((store) => (
                <tr key={store._id} className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
                  <td className="px-5 py-3 font-semibold text-[#17191c] font-dashboard_regular whitespace-nowrap">{store.name}</td>
                  <td className="px-5 py-3 text-[#777b86] font-selleasy_normal whitespace-nowrap">{store.subdomain}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-[#f2f0ed] text-[#4c4c4c] capitalize">{store.plan}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 ${store.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {store.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#777b86] font-selleasy_normal whitespace-nowrap">
                    {new Date(store.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleActive(store)}
                        className="text-xs font-semibold text-[#5d2a1a] hover:underline font-dashboard_regular whitespace-nowrap"
                      >
                        {store.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(store._id, store.name)}
                        disabled={deleting}
                        className="text-xs font-semibold text-red-600 hover:underline font-dashboard_regular"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">No stores found{search ? ` for "${search}"` : ""}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#a3a6af] font-selleasy_normal">Page {currentPage} of {totalPages}</span>
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