import UserTable from "@/components/dashboard/common/table/Table";
import ProductModal from "@/components/modals/dashboard/productmanagement/ProductModal";
import DeleteProductModal from "@/components/modals/deleteModals/DeleteProductModal";
import { useGetAllStoreProductQuery } from "@/redux/services/productApi";
import { onProductModal } from "@/redux/slices/modalSlice";
import { AnimatePresence } from "framer-motion";
import { GoPlus } from "react-icons/go";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
export default function Product() {
  const { id } = useParams();
  const { isProductModal, isDeleteModal } = useSelector(
    (store: any) => store.modal
  );
  const dispatch = useDispatch();

  const { data: storeProduct } = useGetAllStoreProductQuery({ storeid: id });
  const DEFAULT_HEADERS = [
    "title",
    "price",
    "category",
    "size",
    "color",
    "Actions",
  ];

  // console.log("storeProduct", storeProduct);
  return (
    <>
      {/* product management modal animation */}
      <AnimatePresence mode="wait">
        {isProductModal && <ProductModal />}
      </AnimatePresence>

      {/* delete product management modal animation */}
      <AnimatePresence mode="wait">
        {isDeleteModal && <DeleteProductModal />}
      </AnimatePresence>

      <div className="w-full  p-4 py-8 lg:p-12 mx-auto">
        <div className="w-full flex flex-col gap-12">
          <div className="w-full flex items-center justify-between gap-4">
            <h4 className="text-3xl font-selleasy_bold flex-1">
              Products Management
              <span className="block text-sm w font-k_font font-normal pt-1 leading-[1.3] text-[#64645f] max-w-[450px]">
                Make changes to your profile and to the entire app Enable
                dropdown and tab-complete suggestions while typing a query
              </span>
            </h4>
            <div className="flex items-center justify-end">
              <button
                onClick={() => dispatch(onProductModal(""))}
                style={{ transition: "all .2s" }}
                className="bg-[var(--dark-1)] flex items-center gap-2 rounded-xl hover:scale-[0.9] text-white text-sm p-3 px-4 font-dashboard_regular"
              >
                <GoPlus fontSize={"24px"} /> Add Product
              </button>
            </div>
          </div>

          <div className="w-full">
            {/* <div className="w-full flex flex-col items-center justify-center  gap-4">
              <h5 className="text-base lg:text-lg text-center font-dashboard_regular flex-1">
                No Product Listings
                <span className="block text-xs font-selleasy_normal leading-[1.4] text-[#64645f] max-w-[450px]">
                  Make changes to your profile and to the entire app Enable
                  dropdown and tab-complete suggestions while typing a query
                </span>
              </h5>
            </div> */}

            <UserTable
              type="product"
              headers={DEFAULT_HEADERS}
              data={storeProduct}
              onDeleteUser={() => {}}
              deleteModal={{
                userId: "",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
