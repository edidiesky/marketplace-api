import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { closeDeleteModal } from "@/redux/slices/modalSlice";
import { slide } from "@/constants/framer";
import toast from "react-hot-toast";
import Loader from "../../common/loader";
import { useDeleteSizeMutation } from "@/redux/services/sizeApi";

const DeleteSizeModal = () => {
  const dispatch = useDispatch();
  const { open: isDeleteModal, id: deleteId } = useSelector(
    (state: { modal: { delete: { open: boolean; id: string | null } } }) => state.modal.delete
  );
  const [deleteSize, { isLoading }] = useDeleteSizeMutation();

  const handleDelete = async () => {
    try {
      await deleteSize(deleteId).unwrap();
      toast.success("Size has been deleted successfully!");
      dispatch(closeDeleteModal());
    } catch (error: unknown) {
      if (error instanceof Error) toast.error(error.message);
    }
  };

  return (
    <div className="h-[100vh] bg-[#16161639] inset-0 backdrop-blur-sm w-full fixed top-0 left-0 z-[5000] flex items-end md:items-center justify-end md:justify-center">
      <motion.div
        variants={slide}
        initial="initial"
        animate={isDeleteModal ? "enter" : "exit"}
        exit="exit"
        className="w-full min-h-[30%] md:w-[500px] md:max-w-[550px] pt-6 md:min-h-[200px] justify-between relative items-start flex flex-col gap-4 bg-white"
      >
        <div className="w-full flex px-8 items-center justify-between gap-1">
          <h3 className="text-xl font-work_font font-semibold">
            <span>Delete Size</span>
            <span className="text-sm block font-normal font-work_font text-[#777] max-w-[550px]">
              Are you sure you want to delete this Size? This cannot be undone!
            </span>
          </h3>
        </div>
        <div className="w-full flex flex-col gap-4">
          <div className="w-full text-sm flex px-8 py-4 border-t items-center justify-end gap-3">
            <button type="button" onClick={() => dispatch(closeDeleteModal())} className="btn btn_small flex items-center justify-center cursor-pointer font-work_font">
              Cancel
            </button>
            <button onClick={handleDelete} className="btn btn_small_3 flex items-center justify-center cursor-pointer font-work_font">
              {isLoading ? (
                <span className="flex w-full items-center justify-center gap-2">Deleting <Loader type="dots" color="#000" /></span>
              ) : <>Delete</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DeleteSizeModal;