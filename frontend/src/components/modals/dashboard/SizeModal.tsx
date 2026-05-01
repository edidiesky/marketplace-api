"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RxCross2 } from "react-icons/rx";
import { useSelector, useDispatch } from "react-redux";
import { offSizeModal } from "@/redux/slices/modalSlice";
import { slide } from "@/constants/framer";
import {
  useCreateSizeMutation,
  useGetSingleSizeQuery,
  useUpdateSizeMutation,
} from "@/redux/services/sizeApi";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import Loader from "@/components/loader";

const formData: {
  name: string;
  type: string;
  placeholder: string;
  label: string;
}[] = [
  {
    name: "name",
    type: "text",
    placeholder: "Size Name (be brief)",
    label: "Size Name",
  },
  {
    name: "value",
    type: "text",
    placeholder: "Enter your Size value like (Xl, L, Sm)",
    label: "Size value",
  },
];
const CreateSizeModal = () => {
  const { isSizeModal, sizeId } = useSelector(
    (store: any) => store.modal
  );
  const [formValue, setFormValue] = useState({
    name: "",
    value: "",
  });
  const { id } = useParams();
  const dispatch = useDispatch();

  // querying a single Size
  const { data: SizeData, isLoading: isGetSizeLoading } =
    useGetSingleSizeQuery(sizeId, { skip: !sizeId });

  //
  const [createSize, { isLoading }] = useCreateSizeMutation();

  const [updateSize, { isLoading: isEditLoading }] =
    useUpdateSizeMutation();
    
  const noEntry =
    formValue.name === "" || isLoading || isEditLoading || isGetSizeLoading;

  // Onchange handler
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValue({ ...formValue, [e.target.name]: e.target.value });
  };

  //  create Size handler
  const handleCreateSize = async () => {
    try {
      const data = await createSize({ storeid: id, ...formValue }).unwrap();
      console.log("Size_data", data);
      toast.success(`${data?.name} Size has been created succesfully!!`);
      let timer = setTimeout(() => dispatch(offSizeModal("")), 300);
      return () => clearTimeout(timer);
    } catch (err: any) {
      const errorMessages = err?.data?.error || [err.error];
      errorMessages.forEach((message: string) => toast.error(message));
      // toast.error(err?.data?.message || err.error);
    }
  };

  // Edit Size handler
  const handleEditSize = async () => {
    try {
      const data = await updateSize({ sizeId, ...formValue }).unwrap();
      console.log("Size_data", data);
      toast.success(`${data?.name} Size has been updated succesfully!!`);
      let timer = setTimeout(() => dispatch(offSizeModal("")), 300);
      return () => clearTimeout(timer);
    } catch (err: any) {
      const errorMessages = err?.data?.error || [err.error];
      errorMessages.forEach((message: string) => toast.error(message));
      // toast.error(err?.data?.message || err.error);
    }
  };

  useEffect(() => {
    if (SizeData) {
      setFormValue({
        ...SizeData,
      });
    }
  }, [SizeData]);
  const handleSizeForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sizeId ? handleEditSize() : handleCreateSize();
  };
  // conso);
  // console.log("sizeId", sizeId)
  // console.log("SizeData", SizeData)

  // console.log("store id", id);
  return (
    <div className="h-[100vh] bg-[#16161639] inset-0 backdrop-blur-sm w-full fixed top-0 left-0 z-[5000] flex items-end lg:items-center justify-end md:justify-center">
      <motion.div
        variants={slide}
        initial="initial"
        animate={isSizeModal ? "enter" : "exit"}
        exit={"exit"}
        className="w-full min-h-[60%] md:w-[380px] md:max-w-[500px]  md:min-h-[240px] justify-end md:justify-center pt-8 relative items-start rounded-t-xl md:rounded-[10px] flex flex-col gap-6 bg-white"
      >
        <div
          onClick={() => dispatch(offSizeModal(""))}
          className="absolute top-4 right-4 text-[#000] cursor-pointer w-12 h-12 flex items-center hover:bg-[#fafafa] rounded-full justify-center text-xl"
        >
          <RxCross2 />
        </div>
        <div className="w-full px-8 flex flex-col">
          <h3 className="text-2xl md:text-2xl font-work_font font-bold">
            {sizeId ? "Update" : "Create"} your Size
          </h3>
          <span className="block text-sm text-[#777] font-work_font md:text-sm max-w-[380px]">
            Give your Size a personality by adding an icon and a title, make
            it concise and brief.
          </span>
        </div>
        <form
          onSubmit={(e) => handleSizeForm(e)}
          className="w-full md:mt-0 mt-4 flex justify-between flex-col gap-6"
        >
          <div className="w-full px-8 flex items-start flex-col gap-2">
            <>
              {formData?.map((form, index) => {
                return (
                  <label
                    key={index}
                    htmlFor="title"
                    className="flex font-work_font font-semibold w-full flex-col gap-1 text-sm"
                  >
                    {form.label}
                    <input
                      type={form.type}
                      value={formValue[form.name]}
                      name={form.name}
                      onChange={onChange}
                      placeholder={form.placeholder}
                      className="text-sm font-normal input w-full bg-white rounded-full"
                    />
                  </label>
                );
              })}
            </>
          </div>
          <div className="w-full pb-3 px-8 pt-4 border-t text-sm flex items-center justify-end gap-3">
            <button
              data-test="Size_modal_1"
              onClick={() => dispatch(offSizeModal(""))}
              className="btn btn_small hover:opacity-[.5] text-[#000] hover:text-[#fff] flex items-center justify-center cursor-pointer hover:bg-[#000] rounded-full regular"
            >
              Cancel
            </button>
            <button
              data-test="Size_modal_2"
              disabled={noEntry}
              className="btn btn_small_3 text-[#fff] flex items-center justify-center cursor-pointer  bg-[#3e3aff] rounded-full regular"
            >
              {isLoading || isEditLoading ? (
                <span className="flex w-full items-center justify-center gap-2">
                  {sizeId ? "Updating" : "Creating"}{" "}
                  <Loader type="dots" color="#000" />
                </span>
              ) : (
                <>{sizeId ? "Update" : "Create"}</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateSizeModal;
