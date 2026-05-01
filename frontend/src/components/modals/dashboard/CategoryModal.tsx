"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RxCross2 } from "react-icons/rx";
import { useSelector, useDispatch } from "react-redux";
import { offCategoryModal } from "@/redux/slices/modalSlice";
import { slide } from "@/constants/framer";
import {
  useCreateCategoryMutation,
  useGetSingleCategoryQuery,
  useUpdateCategoryMutation,
} from "@/redux/services/categoryApi";
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
    placeholder: "Category Name (be brief)",
    label: "Category Name",
  },
  {
    name: "value",
    type: "text",
    placeholder: "Enter your category value like (Xl, L, SM)",
    label: "Category value",
  },
];
const CreateCategoryModal = () => {
  const { isCategoryModal, categoryId } = useSelector(
    (store: any) => store.modal
  );
  const [formValue, setFormValue] = useState({
    name: "",
    value: "",
  });
  const { id } = useParams();
  const dispatch = useDispatch();

  // querying a single category
  const { data: categoryData, isLoading: isGetCategoryLoading } =
    useGetSingleCategoryQuery(categoryId, { skip: !categoryId });

  //
  const [createCategory, { isLoading }] = useCreateCategoryMutation();

  const [updateCategory, { isLoading: isEditLoading }] =
    useUpdateCategoryMutation();
    
  const noEntry =
    formValue.name === "" || isLoading || isEditLoading || isGetCategoryLoading;

  // Onchange handler
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValue({ ...formValue, [e.target.name]: e.target.value });
  };

  //  create Category handler
  const handleCreateCategory = async () => {
    try {
      const data = await createCategory({ storeid: id, ...formValue }).unwrap();
      console.log("Category_data", data);
      toast.success(`${data?.name} category has been created succesfully!!`);
      let timer = setTimeout(() => dispatch(offCategoryModal("")), 300);
      return () => clearTimeout(timer);
    } catch (err: any) {
      const errorMessages = err?.data?.error || [err.error];
      errorMessages.forEach((message: string) => toast.error(message));
      // toast.error(err?.data?.message || err.error);
    }
  };

  // Edit Category handler
  const handleEditCategory = async () => {
    try {
      const data = await updateCategory({ categoryId, ...formValue }).unwrap();
      console.log("Category_data", data);
      toast.success(`${data?.name} category has been updated succesfully!!`);
      let timer = setTimeout(() => dispatch(offCategoryModal("")), 300);
      return () => clearTimeout(timer);
    } catch (err: any) {
      const errorMessages = err?.data?.error || [err.error];
      errorMessages.forEach((message: string) => toast.error(message));
      // toast.error(err?.data?.message || err.error);
    }
  };

  useEffect(() => {
    if (categoryData) {
      setFormValue({
        ...categoryData,
      });
    }
  }, [categoryData]);
  const handleCategoryForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    categoryId ? handleEditCategory() : handleCreateCategory();
  };
  // conso);
  // console.log("categoryId", categoryId)
  // console.log("categoryData", categoryData)

  // console.log("store id", id);
  return (
    <div className="h-[100vh] bg-[#16161639] inset-0 backdrop-blur-sm w-full fixed top-0 left-0 z-[5000] flex items-end lg:items-center justify-end md:justify-center">
      <motion.div
        variants={slide}
        initial="initial"
        animate={isCategoryModal ? "enter" : "exit"}
        exit={"exit"}
        className="w-full min-h-[60%] md:w-[380px] md:max-w-[500px]  md:min-h-[240px] justify-end md:justify-center pt-8 relative items-start rounded-t-xl md:rounded-[10px] flex flex-col gap-6 bg-white"
      >
        <div
          onClick={() => dispatch(offCategoryModal(""))}
          className="absolute top-4 right-4 text-[#000] cursor-pointer w-12 h-12 flex items-center hover:bg-[#fafafa] rounded-full justify-center text-xl"
        >
          <RxCross2 />
        </div>
        <div className="w-full px-8 flex flex-col">
          <h3 className="text-2xl md:text-2xl font-work_font font-bold">
            {categoryId ? "Update" : "Create"} your Category
          </h3>
          <span className="block text-sm text-[#777] font-work_font md:text-sm max-w-[380px]">
            Give your Category a personality by adding an icon and a title, make
            it concise and brief.
          </span>
        </div>
        <form
          onSubmit={(e) => handleCategoryForm(e)}
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
              data-test="category_modal_1"
              onClick={() => dispatch(offCategoryModal(""))}
              className="btn btn_small hover:opacity-[.5] text-[#000] hover:text-[#fff] flex items-center justify-center cursor-pointer hover:bg-[#000] rounded-full regular"
            >
              Cancel
            </button>
            <button
              data-test="category_modal_2"
              disabled={noEntry}
              className="btn btn_small_3 text-[#fff] flex items-center justify-center cursor-pointer  bg-[#3e3aff] rounded-full regular"
            >
              {isLoading || isEditLoading ? (
                <span className="flex w-full items-center justify-center gap-2">
                  {categoryId ? "Updating" : "Creating"}{" "}
                  <Loader type="dots" color="#000" />
                </span>
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
