import UserTable from "@/components/dashboard/common/table/Table";
import CreateSizeModal from "@/components/modals/dashboard/SizeModal";
import { useGetAllStoreSizeQuery } from "@/redux/services/sizeApi";
import { AnimatePresence } from "framer-motion";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ModalState, openSizeModal } from "@/redux/slices/modalSlice";
import DeleteSizeModal from "@/components/modals/deleteModals/DeleteSizeModal";
export default function Size() {
  const { size, delete: deleteModalState } = useSelector(
    (store: { modal: ModalState }) => store.modal
  );

  const { id } = useParams();
  const { data: storeSizeResponse } = useGetAllStoreSizeQuery({ storeid: id });
  const storeSize = storeSizeResponse?.data ?? [];
  const DEFAULT_HEADERS = ["ID", "Name", "Value", "Actions"];
  const dispatch = useDispatch();

  return (
    <>
      <AnimatePresence mode="wait">
        {size.open && <CreateSizeModal />}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {deleteModalState.open && <DeleteSizeModal />}
      </AnimatePresence>
      <div className="w-full  p-4 py-8 lg:p-12 mx-auto">
        <div className="w-full flex flex-col gap-12">
          <div className="w-full flex items-start lg:flex-row flex-col md:items-center justify-between gap-4">
            <h4 className="text-2xl md:text-3xl flex-1">
              Size Management
              <span className="block text-sm  pt-1 leading-[1.3] text-[#64645f] max-w-[450px]">
                Make changes to your profile and to the entire app Enable
                dropdown and tab-complete suggestions while typing a query
              </span>
            </h4>
            <div className="flex items-center justify-end">
              <button
                onClick={() => dispatch(openSizeModal(""))}
                style={{ transition: "all .2s" }}
                className="bg-[var(--dark-1)] flex items-center gap-2 rounded-xl hover:scale-[0.9] text-white text-base p-3 px-4 "
              >
                Add Size
              </button>
            </div>
          </div>

          <div className="w-full">
            {/* <div className="w-full flex flex-col items-center justify-center  gap-4">
              <h5 className="text-base lg:text-lg text-center flex-1">
                No Size Listings
                <span className="block text-xs leading-[1.4] text-[#64645f] max-w-[450px]">
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