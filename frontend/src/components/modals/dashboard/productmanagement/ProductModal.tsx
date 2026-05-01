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
  useGetSingleProductQuery,
  useUpdateProductMutation,
} from "@/redux/services/productApi";
import { offProductModal } from "@/redux/slices/modalSlice";
import { productFormData } from "@/constants/forms";
import CategorySelect from "./CategorySelect";
import ColorSelect from "./ColorSelect";
import SizeSelect from "./SizeSelect";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import { productDataType } from "../../../../constants/types";
const ProductModal = () => {
  const [formvalue, setFormValue] = useState<productDataType>({
    price: 0,
    name: "",
    images: ["/images/products/shoe_1.jpg", "/images/products/shoe_2.jpg"],
    availableStock: 0,
    thresholdStock: 0,
    description: "",
    isArchive: false,
    colors: [],
    size: [],
    category: [],
  });
  const { isProductModal, productId } = useSelector(
    (store: any) => store.modal
  );
  const { id } = useParams();

  const dispatch = useDispatch();
  // querying a single Product
  const { data: productData } = useGetSingleProductQuery(productId, {
    skip: !productId,
  });

  const onChange = (e: { target: { name: any; value: any } }) => {
    const { name, value } = e.target;
    setFormValue((prev) => ({ ...prev, [name]: value }));
  };

  const [createProduct, { isLoading }] = useCreateProductMutation();

  const [updateProduct, { isLoading: isEditLoading }] =
    useUpdateProductMutation();

  // handler for selecting categories
  const onSelectCategoryChange = (value: string[]) => {
    setFormValue((prev) => ({ ...prev, category: value }));
  };

  // handler for selecting categories
  const onSelectSizeChange = (values: { name: string; value: string }[]) => {
    setFormValue((prev) => ({ ...prev, size: values }));
  };

  // handler for selecting categories
  const onSelectColorChange = (values: { name: string; value: string }[]) => {
    setFormValue((prev) => ({ ...prev, colors: values }));
  };

  const onDescriptionChange = (value: string) => {
    const sanitizedValue = sanitizeHtml(value, {
      allowedTags: ["p", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2"],
      allowedAttributes: {
        a: ["href"],
      },
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

  // handler for creatign the product
  const handleCreateProduct = async () => {
    try {
      const data = await createProduct({ storeid: id, ...formvalue }).unwrap();
      // console.log("product_data", data);
      toast.success(`${data?.name} product has been created succesfully!!`);
      let timer = setTimeout(() => dispatch(offProductModal("")), 300);
      return () => clearTimeout(timer);
    } catch (err: any) {
      const errorMessages = err?.data?.error || [err.error];
      errorMessages.forEach((message: string) => toast.error(message));
      // toast.error(err?.data?.message || err.error);
    }
  };

  // handler for updating the product
  const handleUpdateProduct = async () => {
    try {
      const data = await updateProduct({ id:productId, ...formvalue }).unwrap();
      // console.log("product_data", data);
      toast.success(`${data?.name} product has been updated succesfully!!`);
      let timer = setTimeout(() => dispatch(offProductModal("")), 300);
      return () => clearTimeout(timer);
    } catch (err: any) {
      const errorMessages = err?.data?.error || [err.error];
      errorMessages.forEach((message: string) => toast.error(message));
      // toast.error(err?.data?.message || err.error);
    }
  };

  // performing side effects to fetch product
  useEffect(() => {
    if (productData) {
      const transformedColors = productData.colors.map((color: any) => ({
        name: color.name || color,
        value: color.value || color,
      }));
      setFormValue({
        ...productData,
        colors: transformedColors,
        size: productData.size || [],
      });
    }
  }, [productData]);

  // console.log("product formvalue", formvalue);

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-end z-50 p-4">
      <motion.div
        variants={slideRight}
        initial="initial"
        animate={isProductModal ? "enter" : "exit"}
        exit={"exit"}
        className="bg-[#fff] w-full rounded-xl overflow-hidden relative flex flex-col lg:w-[550px] h-[95vh]"
      >
        {/* Header */}
        <div className="border-b w-full items-center justify-center h-[80px] flex flex-col gap-8 px-4">
          <div className="flex justify-between items-center w-full">
            <div className="flex pl-4 gap-2 items-center">
              <h4 className="text-xl  font-dashboard_regular">
                Create Product
              </h4>
            </div>
            <button
              onClick={() => dispatch(offProductModal(""))}
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm hover:bg-[#fafafa]"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div
          style={{
            height: "calc(95vh - 80px)",
          }}
          className="w-full flex flex-col gap-2 justify-between"
        >
          <div
            style={{
              height: "calc(95vh - 80px - 70px)",
            }}
            className="px-4 w-full overflow-auto"
          >
            <div className="grid grid-cols-1 gap-4 p-4 px-4">
              {productFormData?.map((form, index) => {
                return (
                  <label
                    key={index}
                    className="w-full flex font-dashboard_normal flex-col gap-1 text-sm lg:text-base"
                    htmlFor={form.label}
                  >
                    <span>{form.label}</span>
                    {form.type === "textarea" ? (
                      <div className="w-full font-selleasy_normal h-[150px]">
                        <ReactQuill
                          value={formvalue.description}
                          onChange={onDescriptionChange}
                          placeholder={form.placeholder}
                          modules={modules}
                          // theme="snow"
                          className="w-full text-sm font-selleasy_normal"
                          style={{ height: "100px", fontFamily:"Regular" }}
                        />
                      </div>
                    ) : (
                      <input
                        type={form.type}
                        name={form.name}
                        onChange={onChange}
                        placeholder={form.placeholder}
                        value={formvalue[form.name] as string | number}
                        className="w-full h-[45px] text-sm font-selleasy_normal rounded-md border px-4"
                      />
                    )}
                  </label>
                );
              })}
              {/* category */}
              <div className="w-full grid grid-cols-1 gap-3">
                <CategorySelect
                  onCheckedChange={onSelectCategoryChange}
                  formvalue={formvalue}
                />
                {/* size */}
                <ColorSelect
                  onCheckedChange={onSelectColorChange}
                  formvalue={formvalue}
                />
                {/* size */}
                <SizeSelect
                  onCheckedChange={onSelectSizeChange}
                  formvalue={formvalue}
                />
              </div>
            </div>
          </div>

          <div className="border-t sticky z-[100] bottom-0 h-[70px] w-full flex flex-col gap-8 p-4 px-6">
            <div className="flex justify-between items-center w-full">
              <button
                aria-label="Close modal"
                onClick={() => dispatch(offProductModal(""))}
                className="btn btn_small_2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={
                  productData ? handleUpdateProduct : handleCreateProduct
                }
                aria-label="Perform action"
                className="btn btn_small text-sm"
              >
                {productData && !isEditLoading
                  ? "update product"
                  : !productData && isLoading
                  ? "Saving Action.."
                  : productData && isEditLoading
                  ? "Updating product..."
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
