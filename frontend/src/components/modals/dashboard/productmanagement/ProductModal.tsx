import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import sanitizeHtml from "sanitize-html";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useSelector, useDispatch } from "react-redux";
import { X } from "lucide-react";
import { slideRight } from "@/constants/framer";
import {
  useCreateProductMutation,
  useGetProductQuery,
  useUpdateProductMutation,
} from "@/redux/services/productApi";
import { closeProductModal } from "@/redux/slices/modalSlice";
import { productFormData } from "@/constants/forms";
import CategorySelect from "./CategorySelect";
import ColorSelect from "./ColorSelect";
import SizeSelect from "./SizeSelect";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import type { ProductDataType, ProductFormDataItem } from "@/types/form";
import type { ProductColorOrSize } from "@/types/api";

const ProductModal = () => {
  const [formvalue, setFormValue] = useState<ProductDataType>({
    price: 0, name: "", images: [], availableStock: 0,
    thresholdStock: 0, description: "", isArchive: false,
    colors: [], size: [], category: [],
  });

  const { open: isProductModal, id: productId } = useSelector(
    (state: { modals: { product: { open: boolean; id: string | null } } }) => state.modals.product
  );
  const { id } = useParams();
  const dispatch = useDispatch();

  const { data: productResponse } = useGetProductQuery(productId!, { skip: !productId });
  const productData = productResponse?.data;

  const [createProduct, { isLoading }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isEditLoading }] = useUpdateProductMutation();

  const onChange = (e: { target: { name: string; value: string } }) => {
    setFormValue((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSelectCategoryChange = (value: string[]) =>
    setFormValue((prev) => ({ ...prev, category: value }));

  const onSelectSizeChange = (values: ProductColorOrSize[]) =>
    setFormValue((prev) => ({ ...prev, size: values }));

  const onSelectColorChange = (values: ProductColorOrSize[]) =>
    setFormValue((prev) => ({ ...prev, colors: values }));

  const onDescriptionChange = (value: string) => {
    const sanitizedValue = sanitizeHtml(value, {
      allowedTags: ["p", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2"],
      allowedAttributes: { a: ["href"] },
      disallowedTagsMode: "discard",
    });
    setFormValue((prev) => ({ ...prev, description: sanitizedValue }));
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline"],
      ["link"],
      [{ list: "ordered" }, { list: "bullet" }],
    ],
  };

  const handleCreateProduct = async () => {
    try {
      const result = await createProduct({ storeid: id!, ...formvalue }).unwrap();
      toast.success(`${result.data?.name} product has been created successfully!`);
      const timer = setTimeout(() => dispatch(closeProductModal()), 300);
      return () => clearTimeout(timer);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  const handleUpdateProduct = async () => {
    try {
      const result = await updateProduct({ id: productId!, ...formvalue }).unwrap();
      toast.success(`${result.data?.name} product has been updated successfully!`);
      const timer = setTimeout(() => dispatch(closeProductModal()), 300);
      return () => clearTimeout(timer);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  useEffect(() => {
    if (productData) {
      const transformedColors: ProductColorOrSize[] = (productData.colors ?? []).map(
        (color: ProductColorOrSize) => ({
          name: color.name ?? "",
          value: color.value ?? "",
        })
      );
      const transformedSize: ProductColorOrSize[] = (productData.size ?? []).map(
        (s: ProductColorOrSize) => ({
          name: s.name ?? "",
          value: s.value ?? "",
        })
      );
      setFormValue((prev) => ({
        ...prev,
        name: productData.name,
        price: productData.price,
        description: productData.description,
        images: productData.images,
        isArchive: productData.isArchive,
        category: productData.category,
        colors: transformedColors,
        size: transformedSize,
        availableStock: productData.availableStock ?? 0,
        thresholdStock: productData.thresholdStock ?? 0,
      }));
    }
  }, [productData]);

  const nonDescriptionFields = (productFormData as ProductFormDataItem[]).filter(
    (f) => f.type !== "textarea"
  );
  const descriptionField = (productFormData as ProductFormDataItem[]).find(
    (f) => f.type === "textarea"
  );

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-end z-50 p-4">
      <motion.div
        variants={slideRight}
        initial="initial"
        animate={isProductModal ? "enter" : "exit"}
        exit="exit"
        className="bg-white w-full overflow-hidden relative flex flex-col lg:w-[750px] h-[95vh]"
      >
        <div className="border-b w-full items-center h-[80px] flex px-8">
          <div className="flex justify-between items-center w-full">
            <div>
              <h4 className="text-xl font-dashboard_regular text-[#17191c]">
                {productData ? "Edit Product" : "Create Product"}
              </h4>
              <p className="text-xs font-selleasy_normal text-[#777b86] mt-0.5">
                {productData
                  ? "Update your product details, pricing, and availability."
                  : "Fill in the details below to add a new product to your store."}
              </p>
            </div>
            <button
              onClick={() => dispatch(closeProductModal())}
              className="w-10 h-10 flex items-center justify-center text-sm hover:bg-[#fafafa]"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ height: "calc(95vh - 80px)" }} className="w-full flex flex-col justify-between">
          <div style={{ height: "calc(95vh - 80px - 70px)" }} className="px-8 w-full overflow-auto">
            <div className="py-6 flex flex-col gap-6">

              {/* 2-col grid for non-description fields */}
              <div className="grid grid-cols-2 gap-4">
                {nonDescriptionFields.map((form, index) => (
                  <label
                    key={index}
                    className="w-full flex font-dashboard_normal flex-col gap-1 text-sm"
                    htmlFor={form.name}
                  >
                    <span className="text-sm text-[#17191c] font-semibold font-dashboard_regular">
                      {form.label}
                    </span>
                    <input
                      id={form.name}
                      type={form.type}
                      name={form.name}
                      onChange={onChange}
                      placeholder={form.placeholder}
                      value={formvalue[form.name] as string | number}
                      className="w-full h-[45px] text-sm font-selleasy_normal border border-[#e8e6e3] px-4 outline-none focus:border-[#17191c] transition-colors"
                    />
                  </label>
                ))}
              </div>

              {/* selects row */}
              <div className="grid grid-cols-3 gap-4">
                <CategorySelect onCheckedChange={onSelectCategoryChange} formvalue={formvalue} />
                <ColorSelect onCheckedChange={onSelectColorChange} formvalue={formvalue} />
                <SizeSelect onCheckedChange={onSelectSizeChange} formvalue={formvalue} />
              </div>

              {/* description full width */}
              {descriptionField && (
                <label
                  className="w-full flex font-dashboard_normal flex-col gap-1 text-sm"
                  htmlFor="description"
                >
                  <span className="text-sm text-[#17191c] font-semibold font-dashboard_regular">
                    {descriptionField.label}
                  </span>
                  <div className="w-full border border-[#e8e6e3] h-[200px]">
                    <ReactQuill
                      value={formvalue.description}
                      onChange={onDescriptionChange}
                      placeholder={descriptionField.placeholder}
                      modules={modules}
                      className="w-full h-[158px] text-sm font-selleasy_normal"
                    />
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="border-t h-[70px] w-full flex items-center px-8">
            <div className="flex justify-between items-center w-full">
              <button
                onClick={() => dispatch(closeProductModal())}
                className="text-sm font-semibold text-[#4c4c4c] hover:text-[#17191c] font-dashboard_regular"
                aria-label="Close modal"
              >
                Cancel
              </button>
              <button
                onClick={productData ? handleUpdateProduct : handleCreateProduct}
                className="bg-[var(--dark-1)] flex items-center gap-2 hover:opacity-90 text-white text-sm p-3 px-6 font-dashboard_regular"
                aria-label="Perform action"
              >
                {productData && !isEditLoading ? "Update product"
                  : !productData && isLoading ? "Saving..."
                  : productData && isEditLoading ? "Updating..."
                  : "Save product"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductModal;