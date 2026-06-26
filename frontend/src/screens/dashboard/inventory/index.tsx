import { useState } from "react";
import { useParams } from "react-router-dom";
import { useGetAllStoreInventoryQuery } from "@/redux/services/inventoryApi";
import { AnimatePresence } from "framer-motion";
import type { Inventory } from "@/types/api";
import UpdateStockModal from "./components/modal/StcokModal";
import { DataTable } from "@/components/dashboard/common/table/Datatable";

type ModalState = { open: boolean; item: Inventory | null };

const ROWS_PER_PAGE = 10;

const HEADERS = [
  "Product ID", "Available", "On Hand", "Reserved",
  "Reorder Point", "Warehouse", "Status", "",
];

export default function Inventory() {
  const { id } = useParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch]           = useState("");
  const [modal, setModal]             = useState<ModalState>({ open: false, item: null });

  const { data: inventoryResponse, isLoading } = useGetAllStoreInventoryQuery(
    { storeId: id!, page: currentPage, limit: ROWS_PER_PAGE },
    { skip: !id }
  );

  const inventory: Inventory[] = inventoryResponse?.data?.inventories ?? [];
  const total                  = inventoryResponse?.data?.totalCount  ?? 0;
  const totalPages             = inventoryResponse?.data?.totalPages  ?? 1;

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
          <UpdateStockModal
            item={modal.item}
            onClose={() => setModal({ open: false, item: null })}
          />
        )}
      </AnimatePresence>

      <div className="w-full p-4 py-8 lg:p-12 mx-auto">
        <div className="w-full flex flex-col gap-8">

          {/* page header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-xl lg:text-2xl font-selleasy_bold text-[#17191c]">
                Inventory
              </h4>
              <p className="text-sm font-k_font text-[#64645f] mt-1 max-w-[420px]">
                Track stock levels, set reorder points, and manage warehouse details.
              </p>
            </div>
          </div>

          <DataTable
            headers={HEADERS}
            colSpan={HEADERS.length}
            total={total}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search by product or warehouse..."
            isLoading={isLoading}
            isEmpty={filtered.length === 0}
            emptyMessage="No inventory records found"
            toolbar={
              lowStock.length > 0 ? (
                <div className="border border-yellow-200 bg-yellow-50 px-5 py-4">
                  <p className="text-sm font-semibold text-yellow-800 font-k_font">
                    {lowStock.length} item{lowStock.length > 1 ? "s" : ""} at or below reorder point
                  </p>
                  <p className="text-xs text-yellow-700 font-k_font mt-0.5">
                    Review these items and restock to avoid running out.
                  </p>
                </div>
              ) : undefined
            }
          >
            {filtered.map((item) => {
              const isLow =
                item.reorderPoint !== undefined &&
                item.quantityAvailable <= item.reorderPoint;
              return (
                <tr
                  key={item._id}
                  className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors"
                >
                  <td className="px-5 py-3 text-xs text-[#a3a6af] font-k_font whitespace-nowrap">
                    {item.productId}
                  </td>
                  <td className="px-5 py-3 font-semibold text-[#17191c] font-k_font">
                    {item.quantityAvailable}
                  </td>
                  <td className="px-5 py-3 text-[#4c4c4c] font-k_font">
                    {item.quantityOnHand}
                  </td>
                  <td className="px-5 py-3 text-[#4c4c4c] font-k_font">
                    {item.quantityReserved}
                  </td>
                  <td className="px-5 py-3 text-[#4c4c4c] font-k_font">
                    {item.reorderPoint ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[#4c4c4c] font-k_font whitespace-nowrap">
                    {item.warehouseName ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 whitespace-nowrap ${
                        isLow
                          ? "bg-yellow-50 text-yellow-800"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {isLow ? "Low stock" : "In stock"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setModal({ open: true, item })}
                      className="text-xs font-semibold text-[#5d2a1a] hover:underline font-k_font whitespace-nowrap"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </DataTable>

        </div>
      </div>
    </>
  );
}