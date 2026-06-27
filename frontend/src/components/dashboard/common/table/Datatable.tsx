import { type ReactNode } from "react";
import { Input } from "@/components/ui/input";

interface DataTableProps {
  // column header labels in order
  headers:      string[];
  total:        number;
  totalPages:   number;
  currentPage:  number;
  onPageChange: (page: number) => void;
  // search
  search:       string;
  onSearch:     (value: string) => void;
  searchPlaceholder?: string;
  // state
  isLoading:    boolean;
  isEmpty:      boolean;
  emptyMessage?: string;
  toolbar?:     ReactNode;
  // <tr> elements for each data row
  children:     ReactNode;
  // colspan for loading / empty cells
  colSpan:      number;
}

function TableSkeleton({ colSpan }: { colSpan: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-[#f2f0ed]">
          {Array.from({ length: colSpan }).map((__, j) => (
            <td key={j} className="px-5 py-3">
              <div className="h-4 rounded bg-[#f2f0ed] animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DataTable({
  headers,
  total,
  totalPages,
  currentPage,
  onPageChange,
  search,
  onSearch,
  searchPlaceholder = "Search...",
  isLoading,
  isEmpty,
  emptyMessage = "No records found",
  toolbar,
  children,
  colSpan,
}: DataTableProps) {
  const pageNumbers = Array.from(
    { length: Math.min(totalPages, 7) },
    (_, i) => i + 1
  );

  return (
    <div className="w-full flex flex-col gap-4">
      {/* toolbar slot — alert banners, filter dropdowns etc. */}
      {toolbar}

      {/* search + count row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Input
          type="text"
          value={search}
          onChange={(e) => {
            onSearch(e.target.value);
            if (currentPage !== 1) onPageChange(1);
          }}
          placeholder={searchPlaceholder}
          className="w-48 lg:w-64 h-[38px] bg-white border border-[#e8e6e3] text-sm font-k_font outline-none focus:border-[#17191c] transition-colors"
        />
      </div>

      {/* table */}
      <div className="border rounded-2xl border-[#e8e6e3] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e6e3]">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-semibold text-[#a3a6af] uppercase  whitespace-nowrap font-k_font"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton colSpan={colSpan} />
            ) : isEmpty ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-5 py-12 text-center text-sm text-[#a3a6af] font-k_font"
                >
                  {search
                    ? `${emptyMessage} for "${search}"`
                    : emptyMessage}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#a3a6af] font-k_font">
          Page {currentPage} of {totalPages} — {total} records
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-8 px-3 text-xs font-semibold border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] transition-colors font-k_font"
          >
            Prev
          </button>
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`h-8 w-8 text-xs font-semibold border font-k_font transition-colors ${
                currentPage === page
                  ? "bg-[var(--dark-1)] text-white border-[var(--dark-1)]"
                  : "border-[#e8e6e3] text-[#4c4c4c] hover:bg-[#f2f0ed]"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="h-8 px-3 text-xs font-semibold border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] transition-colors font-k_font"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}