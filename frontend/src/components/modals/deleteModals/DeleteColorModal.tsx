"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RxCross2 } from "react-icons/rx";
import { useSelector, useDispatch } from "react-redux";
import { offDeleteModal } from "@/redux/slices/modalSlice";
import { slide } from "@/constants/framer";
import toast from "react-hot-toast";
import Loader from "../../common/loader";
import { useDeleteColorMutation } from "@/redux/services/colorApi";
const DeleteColorModal = () => {
  const dispatch = useDispatch();
  const { isDeleteModal, deleteId } = useSelector(
    (store: { modal: { isDeleteModal: boolean; deleteId: string } }) =>
      store.modal
  );
  const [deleteColor, { isLoading }] = useDeleteColorMutation();
  const handleoffDeleteMessageModal = async () => {
    try {
      await deleteColor(deleteId);
      toast.success("Color has succesfully been deleted!");

      dispatch(offDeleteModal(""));
    } catch (error:unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
 
  };
  return (
    <div className="h-[100vh] bg-[#16161639] inset-0 backdrop-blur-sm w-full fixed top-0 left-0 z-[5000] flex items-end md:items-center justify-end md:justify-center">
      <motion.div
        variants={slide}
        initial="initial"
        animate={isDeleteModal ? "enter" : "exit"}
        exit={"exit"}
        className="w-full min-h-[30%] md:w-[500px] md:max-w-[550px] pt-6 md:min-h-[200px] justify-between relative items-start rounded-t-xl md:rounded-[10px] flex flex-col gap-4 bg-white"
      >
        <div className="w-full flex px-8 items-center justify-between gap-1">
          <h3 className="text-xl md:text-xl font-work_font font-semibold">
            <span className=""> Delete Color</span>

            <span className="text-sm block font-normal font-work_font text-[#777] max-w-[550px] md:text-sm">
              Are you sure you want to delete this color? This cannot be
              undone!
            </span>
          </h3>
          {/* <div onClick={() => dispatch(offDeleteModal(""))} className="text-[#000] cursor-pointer w-12 h-12 flex items-center hover:bg-[#fafafa] rounded-full justify-center text-xl">
                        <RxCross2 />
                    </div> */}
        </div>
        <div className="w-full flex flex-col gap-4">
          <div className="w-full text-sm flex px-8 py-4 border-t items-center justify-end gap-3">
            <button
              data-test="GroupNameModal_button_1"
              onClick={()=> dispatch(offDeleteModal(""))}
              className="btn btn_small flex items-center justify-center cursor-pointer font-work_font"
            >
              Cancel
            </button>
            <button
              data-test="GroupNameModal_button_2"
              onClick={handleoffDeleteMessageModal}
              className="btn btn_small_3 flex items-center justify-center cursor-pointer font-work_font"
            >
              {isLoading ? (
                <span className="flex w-full items-center justify-center gap-2">
                  {"Deleting"} <Loader type="dots" color="#000" />
                </span>
              ) : (
                <>{"Delete"}</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DeleteColorModal;
