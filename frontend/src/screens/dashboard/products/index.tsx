import UserTable from "@/components/dashboard/common/table/Table";
import ProductModal from "@/components/modals/dashboard/productmanagement/ProductModal";
import DeleteProductModal from "@/components/modals/deleteModals/DeleteProductModal";
import { useGetAllStoreProductsQuery } from "@/redux/services/productApi";
import { openProductModal } from "@/redux/slices/modalSlice";
import { AnimatePresence } from "framer-motion";
import { GoPlus } from "react-icons/go";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";

export default function Product() {
  const { id } = useParams();
  const dispatch = useDispatch();

  const { open: isProductModal } = useSelector(
    (state: { modals: { product: { open: boolean; id: string | null } } }) => state.modals.product
  );
  const { open: isDeleteModal } = useSelector(
    (state: { modals: { delete: { open: boolean; id: string | null } } }) => state.modals.delete
  );

  const { data: storeProduct } = useGetAllStoreProductsQuery({ storeid: id! }, { skip: !id });

  const DEFAULT_HEADERS = ["title", "price", "category", "size", "color", "Actions"];

  return (
    <>
      <AnimatePresence mode="wait">
        {isProductModal && <ProductModal />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isDeleteModal && <DeleteProductModal />}
      </AnimatePresence>

      <div className="w-full p-4 py-8 lg:p-12 mx-auto">
        <div className="w-full flex flex-col gap-12">
          <div className="w-full flex items-center justify-between gap-4">
            <h4 className="text-3xl font-selleasy_bold flex-1">
              Products Management
              <span className="block text-sm font-k_font font-normal pt-1 leading-[1.3] text-[#64645f] max-w-[450px]">
                Manage your store products, update listings, and track inventory.
              </span>
            </h4>
            <button
              onClick={() => dispatch(openProductModal(null))}
              style={{ transition: "all .2s" }}
              className="bg-[var(--dark-1)] flex items-center gap-2 hover:opacity-90 text-white text-sm p-3 px-4 font-dashboard_regular"
            >
              <GoPlus fontSize="24px" /> Add Product
            </button>
          </div>

          <div className="w-full">
            <UserTable
              type="product"
              headers={DEFAULT_HEADERS}
              data={storeProduct?.data || []}
              onDeleteUser={() => {}}
              deleteModal={{ userId: "" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}