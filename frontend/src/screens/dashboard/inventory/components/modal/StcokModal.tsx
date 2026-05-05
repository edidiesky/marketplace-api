import { useState } from "react";
import {  useUpdateInventoryMutation } from "@/redux/services/inventoryApi";
import { X } from "lucide-react";
import {  motion } from "framer-motion";
import toast from "react-hot-toast";
import type { Inventory } from "@/types/api";

function UpdateStockModal({ item, onClose }: { item: Inventory; onClose: () => void }) {
  const [reorderPoint, setReorderPoint] = useState<number>(item.reorderPoint ?? 0);
  const [warehouseName, setWarehouseName] = useState<string>(item.warehouseName ?? "");
  const [updateInventory, { isLoading }] = useUpdateInventoryMutation();

  const handleSubmit = async () => {
    try {
      await updateInventory({ id: item._id, reorderPoint, warehouseName }).unwrap();
      toast.success("Inventory updated successfully!");
      onClose();
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.15 }}
        className="bg-white w-full max-w-[440px] mx-4"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e6e3]">
          <div>
            <p className="text-sm font-semibold text-[#17191c] font-dashboard_regular">Update Inventory</p>
            <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5">Adjust reorder point and warehouse details.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-[#f2f0ed] transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="border border-[#e8e6e3] px-4 py-3 grid grid-cols-3 gap-4">
            {[
              { label: "Available", value: item.quantityAvailable },
              { label: "On hand",   value: item.quantityOnHand    },
              { label: "Reserved",  value: item.quantityReserved  },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xs text-[#777b86] font-selleasy_normal">{s.label}</p>
                <p className="text-sm font-semibold text-[#17191c] font-dashboard_regular">{s.value}</p>
              </div>
            ))}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#17191c] font-dashboard_regular">Reorder point</span>
            <input
              type="number"
              min={0}
              value={reorderPoint}
              onChange={(e) => setReorderPoint(Number(e.target.value))}
              className="h-[42px] border border-[#e8e6e3] px-4 text-sm font-selleasy_normal outline-none focus:border-[#17191c] transition-colors"
            />
            <span className="text-xs text-[#a3a6af] font-selleasy_normal">Alert triggers when available stock reaches this number.</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#17191c] font-dashboard_regular">Warehouse name</span>
            <input
              type="text"
              value={warehouseName}
              onChange={(e) => setWarehouseName(e.target.value)}
              placeholder="e.g. Lagos Main Store"
              className="h-[42px] border border-[#e8e6e3] px-4 text-sm font-selleasy_normal outline-none focus:border-[#17191c] transition-colors"
            />
          </label>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[#e8e6e3]">
          <button onClick={onClose} className="text-sm font-semibold text-[#777b86] font-dashboard_regular hover:text-[#17191c]">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-[var(--dark-1)] text-white text-sm font-semibold px-5 py-2 hover:opacity-90 disabled:opacity-50 font-dashboard_regular"
          >
            {isLoading ? "Saving..." : "Save changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default UpdateStockModal