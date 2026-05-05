import { FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  openCategoryModal,
  openDeleteModal,
  openSizeModal,
  openColorModal,
  openProductModal,
} from "@/redux/slices/modalSlice";
import { useDispatch } from "react-redux";
import type { Product, ProductColorOrSize } from "@/types/api";

type CategoryRow = { _id: string; name: string; value: string };
type SizeRow = { _id: string; name: string; value: string };
type ColorRow = { _id: string; name: string; value: string };
type CustomerRow = { _id: string; phone_number: string };

type TableRow = Product | CategoryRow | SizeRow | ColorRow | CustomerRow;

function isProduct(row: TableRow): row is Product {
  return "price" in row && "images" in row;
}
function isCategoryOrSize(row: TableRow): row is CategoryRow {
  return "name" in row && "value" in row && !("price" in row) && !("images" in row);
}
function isCustomer(row: TableRow): row is CustomerRow {
  return "phone_number" in row;
}

export default function ProductTableList({
  tableData,
  type,
}: {
  tableData: TableRow;
  type: string;
}) {
  const dispatch = useDispatch();

  if (type === "product" && isProduct(tableData)) {
    return (
      <tr className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
        <td className="px-5 py-3 whitespace-nowrap text-sm text-[#17191c] font-dashboard_regular">
          {tableData.name}
        </td>
        <td className="px-5 py-3 whitespace-nowrap text-sm text-[#4c4c4c] font-selleasy_normal">
          ₦{tableData.price}
        </td>
        <td className="px-5 py-3 whitespace-nowrap text-sm text-[#4c4c4c] font-selleasy_normal">
          {tableData.category.join(", ")}
        </td>
        <td className="px-5 py-3 whitespace-nowrap text-sm">
          <div className="flex gap-1 items-center flex-wrap">
            {tableData.size.map((s: ProductColorOrSize, index: number) => (
              <span
                key={index}
                className="text-xs px-2 py-0.5 border border-[#e8e6e3] text-[#4c4c4c] font-selleasy_normal"
              >
                {s.value}
              </span>
            ))}
          </div>
        </td>
        <td className="px-5 py-3 whitespace-nowrap text-sm">
          <div className="flex gap-1 items-center">
            {tableData.colors.map((c: ProductColorOrSize, index: number) => (
              <div
                key={index}
                style={{ backgroundColor: c.value }}
                className="w-5 h-5 border border-[#e8e6e3]"
                title={c.name}
              />
            ))}
          </div>
        </td>
        <td className="px-5 py-3 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button
              className="p-2 hover:bg-[#f2f0ed] transition-colors"
              onClick={() => dispatch(openProductModal(tableData._id))}
              aria-label="Edit product"
            >
              <FiEdit2 className="w-4 h-4 text-[#4c4c4c]" />
            </button>
            <button
              className="p-2 hover:bg-red-50 transition-colors"
              onClick={() => dispatch(openDeleteModal(tableData._id))}
              aria-label="Delete product"
            >
              <FiTrash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  if ((type === "category" || type === "Size" || type === "Color") && isCategoryOrSize(tableData)) {
    const openModal =
      type === "category"
        ? openCategoryModal
        : type === "Size"
        ? openSizeModal
        : openColorModal;

    return (
      <tr className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
        <td className="px-5 py-3 whitespace-nowrap text-xs text-[#a3a6af] font-selleasy_normal">
          {tableData._id}
        </td>
        <td className="px-5 py-3 whitespace-nowrap text-sm text-[#17191c] font-dashboard_regular">
          {tableData.name}
        </td>
        <td className="px-5 py-3 whitespace-nowrap text-sm text-[#4c4c4c] font-selleasy_normal">
          {type === "Color" ? (
            <div style={{ backgroundColor: tableData.value }} className="w-5 h-5 border border-[#e8e6e3]" />
          ) : (
            tableData.value
          )}
        </td>
        <td className="px-5 py-3 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button
              className="p-2 hover:bg-[#f2f0ed] transition-colors"
              onClick={() => dispatch(openModal(tableData._id))}
              aria-label={`Edit ${type}`}
            >
              <FiEdit2 className="w-4 h-4 text-[#4c4c4c]" />
            </button>
            <button
              className="p-2 hover:bg-red-50 transition-colors"
              onClick={() => dispatch(openDeleteModal(tableData._id))}
              aria-label={`Delete ${type}`}
            >
              <FiTrash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  if (isCustomer(tableData)) {
    return (
      <tr className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
        <td className="px-5 py-3 whitespace-nowrap text-sm text-[#4c4c4c] font-selleasy_normal">
          {tableData.phone_number}
        </td>
      </tr>
    );
  }

  return null;
}