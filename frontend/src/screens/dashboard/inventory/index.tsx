import { useState } from "react";
import { useParams } from "react-router-dom";
import { useGetAllStoreInventoryQuery } from "@/redux/services/inventoryApi";
import { AnimatePresence } from "framer-motion";
import type { Inventory } from "@/types/api";
import UpdateStockModal from "./components/modal/StcokModal";
import { Input } from "@/components/ui/input";

type ModalState = { open: boolean; item: Inventory | null };

const ROWS_PER_PAGE = 10;


export default function Inventory() {
  const { id } = useParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ open: false, item: null });

  const { data: inventoryResponse, isLoading } = useGetAllStoreInventoryQuery(
    { storeId: id!, page: currentPage, limit: ROWS_PER_PAGE },
    { skip: !id }
  );

  const inventory: Inventory[] = inventoryResponse?.data ?? [];
  const total = inventoryResponse?.pagination?.total ?? 0;
  const totalPages = inventoryResponse?.pagination?.totalPages ?? 1;

  const filtered = inventory.filter((row) =>
    [row.productId, row.warehouseName].some((val) =>
      String(val ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  const lowStock = inventory.filter(
    (i) => i.reorderPoint !== undefined && i.quantityAvailable <= i.reorderPoint
  );

  return (
    <>
      <AnimatePresence>
        {modal.open && modal.item && (
          <UpdateStockModal item={modal.item} onClose={() => setModal({ open: false, item: null })} />
        )}
      </AnimatePresence>

      <div className="w-full p-4 py-8 lg:p-12 mx-auto">
        <div className="w-full flex flex-col gap-8">

          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-xl lg:text-2xl font-selleasy_bold text-[#17191c]">Inventory</h4>
              <p className="text-sm font-selleasy_normal text-[#64645f] mt-1 max-w-[420px]">
                Track stock levels, set reorder points, and manage warehouse details.
              </p>
            </div>
            <span className="text-xs text-[#a3a6af] font-selleasy_normal mt-2">{total} items</span>
          </div>

          {lowStock.length > 0 && (
            <div className="border border-yellow-200 bg-yellow-50 px-5 py-4">
              <p className="text-sm font-semibold text-yellow-800 font-dashboard_regular">
                {lowStock.length} item{lowStock.length > 1 ? "s" : ""} at or below reorder point
              </p>
              <p className="text-xs text-yellow-700 font-selleasy_normal mt-0.5">
                Review these items and restock to avoid running out.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <Input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search by product or warehouse..."
              className="w-48 lg:w-64 px-4 h-[38px] bg-white border border-[#e8e6e3] text-sm font-selleasy_normal outline-none focus:border-[#17191c] transition-colors"
            />
          </div>

          <div className="border border-[#e8e6e3] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8e6e3]">
                  {["Product ID", "Available", "On Hand", "Reserved", "Reorder Point", "Warehouse", "Status", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#a3a6af] uppercase tracking-widest whitespace-nowrap font-dashboard_regular">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">Loading inventory...</td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((item) => {
                    const isLow = item.reorderPoint !== undefined && item.quantityAvailable <= item.reorderPoint;
                    return (
                      <tr key={item._id} className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
                        <td className="px-5 py-3 text-xs text-[#a3a6af] font-selleasy_normal whitespace-nowrap">{item.productId}</td>
                        <td className="px-5 py-3 font-semibold text-[#17191c] font-dashboard_regular">{item.quantityAvailable}</td>
                        <td className="px-5 py-3 text-[#4c4c4c] font-selleasy_normal">{item.quantityOnHand}</td>
                        <td className="px-5 py-3 text-[#4c4c4c] font-selleasy_normal">{item.quantityReserved}</td>
                        <td className="px-5 py-3 text-[#4c4c4c] font-selleasy_normal">{item.reorderPoint ?? "—"}</td>
                        <td className="px-5 py-3 text-[#4c4c4c] font-selleasy_normal whitespace-nowrap">{item.warehouseName ?? "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 whitespace-nowrap ${isLow ? "bg-yellow-50 text-yellow-800" : "bg-green-50 text-green-700"}`}>
                            {isLow ? "Low stock" : "In stock"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setModal({ open: true, item })}
                            className="text-xs font-semibold text-[#5d2a1a] hover:underline font-dashboard_regular whitespace-nowrap"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">
                      No inventory records found{search ? ` for "${search}"` : ""}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a3a6af] font-selleasy_normal">Page {currentPage} of {totalPages} — {total} items</span>
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
    </>
  );
}