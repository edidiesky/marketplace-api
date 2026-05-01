import UserTable from "@/components/dashboard/common/table/Table";
import CreateColorModal from "@/components/modals/dashboard/ColorModal";
import { useGetAllStoreColorQuery } from "@/redux/services/colorApi";
import { AnimatePresence } from "framer-motion";
import { GoPlus } from "react-icons/go";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { onColorModal } from "@/redux/slices/modalSlice";
import DeleteColorModal from "@/components/modals/deleteModals/DeleteColorModal";
export default function Color() {
  const { isColorModal, isDeleteModal } = useSelector(
    (store: any) => store.modal
  );

  const { id } = useParams();
  const { data: storeColor } = useGetAllStoreColorQuery({ storeid: id });
  const DEFAULT_HEADERS = ["ID", "Name", "Value", "Actions"];
  const dispatch = useDispatch();

  // console.log("storeColor", storeColor);
  return (
    <>
      <AnimatePresence mode="wait">
        {isColorModal && <CreateColorModal />}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {isDeleteModal && <DeleteColorModal />}
      </AnimatePresence>
      <div className="w-full lg:w-[90%] max-w-custom_dashboard p-4 py-8 lg:p-12 mx-auto">
        <div className="w-full flex flex-col gap-12">
          <div className="w-full flex items-start lg:flex-row flex-col md:items-center justify-between gap-4">
            <h4 className="text-2xl md:text-3xl font-selleasy_bold flex-1">
              Color Management
              <span className="block text-sm font-k_font font-normal pt-1 leading-[1.3] text-[#64645f] max-w-[450px]">
                Make changes to your profile and to the entire app Enable
                dropdown and tab-complete suggestions while typing a query
              </span>
            </h4>
            <div className="flex items-center justify-end">
              <button
                onClick={() => dispatch(onColorModal(""))}
                style={{ transition: "all .2s" }}
                className="bg-[var(--dark-1)] flex items-center gap-2 rounded-xl hover:scale-[0.9] text-white text-sm lg:text-base p-3 px-4 font-dashboard_regular"
              >
                 Add Color
              </button>
            </div>
          </div>

          <div className="w-full">
            <UserTable
              type="Color"
              headers={DEFAULT_HEADERS}
              data={storeColor}
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
