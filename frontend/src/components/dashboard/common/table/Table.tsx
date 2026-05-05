import { useState } from "react";
import ProductTableList from "./ProductTableList";
import type { Product } from "@/types/api";
import { Input } from "@/components/ui/input";

const DEFAULT_HEADERS = ["User Info", "Location", "Phone", "Status", "Actions"];

type UserTableType = {
  headers: string[];
  data: Product[];
  onDeleteUser: (id: string) => void;
  onSort?: (key: string, direction: string) => void;
  hasMore?: boolean;
  fetchNextPage?: () => void;
  fetchPrevPage?: () => void;
  type: string;
  deleteModal: { userId: string };
};

const ROWS_PER_PAGE = 10;

function Pagination({
  total,
  current,
  onChange,
}: {
  total: number;
  current: number;
  onChange: (page: number) => void;
}) {
  if (total <= 1) return null;

  const getPages = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (current > 3) pages.push("...");
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="h-8 px-3 text-xs font-semibold border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] transition-colors font-dashboard_regular"
      >
        Prev
      </button>
      {getPages().map((page, i) =>
        page === "..." ? (
          <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-xs text-[#a3a6af]">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onChange(page as number)}
            className={`h-8 w-8 text-xs font-semibold border transition-colors font-dashboard_regular ${
              current === page
                ? "bg-[var(--dark-1)] text-white border-[var(--dark-1)]"
                : "border-[#e8e6e3] text-[#4c4c4c] hover:bg-[#f2f0ed]"
            }`}
          >
            {page}
          </button>
        )
      )}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className="h-8 px-3 text-xs font-semibold border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] transition-colors font-dashboard_regular"
      >
        Next
      </button>
    </div>
  );
}

export const UserTable = ({
  headers = DEFAULT_HEADERS,
  data = [],
  onSort,
  type,
}: UserTableType) => {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = data.filter((row) =>
    Object.values(row).some((val) =>
      String(val ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder={`Search ${type}s...`}
          className="w-48 lg:w-64 px-4 h-[38px] bg-white border border-[#e8e6e3] text-sm font-selleasy_normal outline-none focus:border-[#17191c] transition-colors"
        />
        <span className="text-xs text-[#a3a6af] font-selleasy_normal">
          {filtered.length} {type}{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="border border-[#e8e6e3] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e6e3]">
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  onClick={() => onSort?.(header, "asc")}
                  className="px-5 py-3 text-left text-xs font-semibold text-[#a3a6af] uppercase tracking-widest whitespace-nowrap font-dashboard_regular cursor-pointer select-none"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((tableData, rowIndex) => (
                <ProductTableList
                  key={tableData._id ?? rowIndex}
                  type={type}
                  tableData={tableData}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal"
                >
                  No {type}s found{search ? ` for "${search}"` : ""}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#a3a6af] font-selleasy_normal">
          Page {currentPage} of {totalPages}
        </span>
        <Pagination total={totalPages} current={currentPage} onChange={setCurrentPage} />
      </div>
    </div>
  );
};

export default UserTable;