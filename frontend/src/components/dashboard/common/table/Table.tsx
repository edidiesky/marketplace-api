import { useState } from "react";
import ProductTableList from "./ProductTableList";

const DEFAULT_HEADERS = ["User Info", "Location", "Phone", "Status", "Actions"];

type UserTableType = {
  headers: string[];
  data: {
    title: string;
    price: number;
    id: string;
    category: string;
    size: string;
    color: string;
  }[];
  onDeleteUser: (a: string) => void;
  onSort?: (a: string, b: any) => void;
  hasMore?: boolean;
  setDeleteModal?: () => void;
  setIsModalOpen?: () => void;
  onUserClick?: () => void;
  fetchNextPage?: () => void;
  fetchPrevPage?: () => void;
  currentPage?: Number;
  type: string;
};

export const UserTable = ({
  headers = DEFAULT_HEADERS,
  data = [],
  onSort,
  fetchNextPage,
  fetchPrevPage,
  hasMore,
  currentPage,
  type,
}: UserTableType) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const handleSort = (key: any) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    onSort?.(key, direction);
  };

  return (
    <div className="w-full min-h-[250px] items-center justify-center p-4 border py-8 bg-[#f9f9f9] rounded-lg flex flex-col">
      <div className="overflow-auto w-full flex flex-col gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search on your store!"
            className="w-32 lg:w-56 px-4 h-[40px] bg-[#f1f1f1] border rounded-xl font-work_font font-normal text-sm"
          />
        </div>
        <table className="w-full divide-y overflow-auto divide-gray-200">
          {/* bg-[#E8E8E3] */}
          <thead className=" ">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className="px-4  py-4 text-left text-sm font-work_font font-normal text-[#777] capitalize tracking-wider cursor-pointer"
                
                >
                  <div className="flex items-center">
                    {header}
                    {/* {index < headers.length - 1 && (
                      <span className="ml-1 flex flex-col">
                        <IoIosArrowUp
                          className={`h-3 w-3 ${
                            sortConfig.key === header.toLowerCase() &&
                            sortConfig.direction === "asc"
                              ? "text-indigo-600"
                              : "text-gray-400"
                          }`}
                        />
                        <IoIosArrowDown
                          className={`h-3 w-3 -mt-1 ${
                            sortConfig.key === header.toLowerCase() &&
                            sortConfig.direction === "desc"
                              ? "text-indigo-600"
                              : "text-gray-400"
                          }`}
                        />
                      </span>
                    )} */}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-200">
            {data.length > 0 ? (
              data.map((tableData: any, rowIndex) => (
                <ProductTableList type={type} tableData={tableData} />
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length + 1}
                  className="px-6 py-6 text-center text-base"
                >
                  <div className="w-full font-selleasy_regular">
                    {type === "product" ? "No Products created" : ""}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Showing {data.length} {type}
            </span>
            <div className="flex space-x-1">
              <button
                onClick={fetchPrevPage}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={fetchNextPage}
                disabled={hasMore}
                className="px-3 py-1 border rounded text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTable;
