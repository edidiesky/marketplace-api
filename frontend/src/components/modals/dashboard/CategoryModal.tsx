import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RxCross2 } from "react-icons/rx";
import { useSelector, useDispatch } from "react-redux";
import { closeCategoryModal } from "@/redux/slices/modalSlice";
import { slide } from "@/constants/framer";
import {
  useCreateCategoryMutation,
  useGetSingleCategoryQuery,
  useUpdateCategoryMutation,
} from "@/redux/services/categoryApi";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import Loader from "@/components/loader";

const formData = [
  { name: "name",  type: "text", placeholder: "Category Name", label: "Category Name"  },
  { name: "value", type: "text", placeholder: "Category value", label: "Category value" },
];

const CreateCategoryModal = () => {
  const { open: isCategoryModal, id: categoryId } = useSelector(
    (state: { modals: { category: { open: boolean; id: string | null } } }) => state.modals.category
  );
  const [formValue, setFormValue] = useState({ name: "", value: "" });
  const { id } = useParams();
  const dispatch = useDispatch();

  const { data: categoryData, isLoading: isGetCategoryLoading } = useGetSingleCategoryQuery(categoryId, { skip: !categoryId });
  const [createCategory, { isLoading }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isEditLoading }] = useUpdateCategoryMutation();

  const noEntry = formValue.name === "" || isLoading || isEditLoading || isGetCategoryLoading;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValue({ ...formValue, [e.target.name]: e.target.value });
  };

  const handleCreate = async () => {
    try {
      const data = await createCategory({ storeid: id, ...formValue }).unwrap();
      toast.success(`${data?.name} Category has been created successfully!`);
      const timer = setTimeout(() => dispatch(closeCategoryModal()), 300);
      return () => clearTimeout(timer);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  const handleEdit = async () => {
    try {
      const data = await updateCategory({ categoryId, ...formValue }).unwrap();
      toast.success(`${data?.name} Category has been updated successfully!`);
      const timer = setTimeout(() => dispatch(closeCategoryModal()), 300);
      return () => clearTimeout(timer);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  useEffect(() => {
    if (categoryData) setFormValue({ ...categoryData });
  }, [categoryData]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if(categoryId) { handleEdit()} else handleCreate();
  };

  return (
    <div className="h-[100vh] bg-[#16161639] inset-0 backdrop-blur-sm w-full fixed top-0 left-0 z-[5000] flex items-end lg:items-center justify-end md:justify-center">
      <motion.div
        variants={slide}
        initial="initial"
        animate={isCategoryModal ? "enter" : "exit"}
        exit="exit"
        className="w-full min-h-[60%] md:w-[380px] md:max-w-[500px] md:min-h-[240px] justify-end md:justify-center pt-8 relative items-start flex flex-col gap-6 bg-white"
      >
        <div onClick={() => dispatch(closeCategoryModal())} className="absolute top-4 right-4 text-[#000] cursor-pointer w-12 h-12 flex items-center hover:bg-[#fafafa] justify-center text-xl">
          <RxCross2 />
        </div>
        <div className="w-full px-8 flex flex-col">
          <h3 className="text-2xl font-work_font font-bold">{categoryId ? "Update" : "Create"} your Category</h3>
          <span className="block text-sm text-[#777] font-work_font max-w-[380px]">Give your Category a name and value, make it concise and brief.</span>
        </div>
        <form onSubmit={handleSubmit} className="w-full mt-4 flex justify-between flex-col gap-6">
          <div className="w-full px-8 flex items-start flex-col gap-2">
            {formData.map((form, index) => (
              <label key={index} className="flex font-work_font font-semibold w-full flex-col gap-1 text-sm">
                {form.label}
                <input
                  type={form.type}
                  value={formValue[form.name as keyof typeof formValue]}
                  name={form.name}
                  onChange={onChange}
                  placeholder={form.placeholder}
                  className="text-sm font-normal input w-full bg-white border px-3 h-[40px]"
                />
              </label>
            ))}
          </div>
          <div className="w-full pb-3 px-8 pt-4 border-t text-sm flex items-center justify-end gap-3">
            <button type="button" onClick={() => dispatch(closeCategoryModal())} className="btn btn_small text-[#000] flex items-center justify-center cursor-pointer">Cancel</button>
            <button disabled={noEntry} className="btn btn_small_3 text-[#fff] flex items-center justify-center cursor-pointer bg-[var(--dark-1)]">
              {isLoading || isEditLoading ? (
                <span className="flex w-full items-center justify-center gap-2">{categoryId ? "Updating" : "Creating"} <Loader type="dots" color="#fff" /></span>
              ) : (
                <>{categoryId ? "Update" : "Create"}</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateCategoryModal;