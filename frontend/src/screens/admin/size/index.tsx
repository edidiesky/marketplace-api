import UserTable from "@/components/dashboard/common/table/Table";
import CreateSizeModal from "@/components/modals/dashboard/SizeModal";
import { useGetAllStoreSizeQuery } from "@/redux/services/sizeApi";
import { AnimatePresence } from "framer-motion";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { onSizeModal } from "@/redux/slices/modalSlice";
import DeleteSizeModal from "@/components/modals/deleteModals/DeleteSizeModal";
export default function Size() {
  const { isSizeModal, isDeleteModal } = useSelector(
    (store: any) => store.modal
  );

  const { id } = useParams();
  const { data: storeSize } = useGetAllStoreSizeQuery({ storeid: id });
  const DEFAULT_HEADERS = ["ID", "Name", "Value", "Actions"];
  const dispatch = useDispatch();

  // console.log("storeSize", storeSize);
  return (
    <>
      <AnimatePresence mode="wait">
        {isSizeModal && <CreateSizeModal />}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {isDeleteModal && <DeleteSizeModal />}
      </AnimatePresence>
      <div className="w-full  p-4 py-8 lg:p-12 mx-auto">
        <div className="w-full flex flex-col gap-12">
          <div className="w-full flex items-start lg:flex-row flex-col md:items-center justify-between gap-4">
            <h4 className="text-2xl md:text-3xl font-selleasy_bold flex-1">
              Size Management
              <span className="block text-sm font-k_font font-normal pt-1 leading-[1.3] text-[#64645f] max-w-[450px]">
                Make changes to your profile and to the entire app Enable
                dropdown and tab-complete suggestions while typing a query
              </span>
            </h4>
            <div className="flex items-center justify-end">
              <button
                onClick={() => dispatch(onSizeModal(""))}
                style={{ transition: "all .2s" }}
                className="bg-[var(--dark-1)] flex items-center gap-2 rounded-xl hover:scale-[0.9] text-white text-base p-3 px-4 font-dashboard_regular"
              >
                Add Size
              </button>
            </div>
          </div>

          <div className="w-full">
            {/* <div className="w-full flex flex-col items-center justify-center  gap-4">
              <h5 className="text-base lg:text-lg text-center font-dashboard_regular flex-1">
                No Size Listings
                <span className="block text-xs font-selleasy_normal leading-[1.4] text-[#64645f] max-w-[450px]">
                  Make changes to your profile and to the entire app Enable
                  dropdown and tab-complete suggestions while typing a query
                </span>
              </h5>
            </div> */}

            <UserTable
              type="Size"
              headers={DEFAULT_HEADERS}
              data={storeSize}
              onDeleteUser={() => {}}
            />
          </div>
        </div>
      </div>
    </>
  );
}
