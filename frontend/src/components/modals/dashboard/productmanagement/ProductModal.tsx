import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import sanitizeHtml from "sanitize-html";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useSelector, useDispatch } from "react-redux";
import { X, Upload, Trash2, ImagePlus, Loader2 } from "lucide-react";
import { slideRight } from "@/constants/framer";
import {
  useCreateProductMutation,
  useGetProductQuery,
  useUpdateProductMutation,
} from "@/redux/services/productApi";
import { closeProductModal } from "@/redux/slices/modalSlice";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import type { ProductColorOrSize } from "@/types/api";
import { uploadImageToCloudinary, UploadProgress } from "@/redux/services/cloudinaryAPI";

//  types 

interface ProductFormState {
  name:           string;
  price:          number;
  images:         string[];
  stockQuantity: number;
  description:    string;
  isArchive:      boolean;
  colors:         ProductColorOrSize[];
  size:           ProductColorOrSize[];
  category:       string[];
}
const EMPTY_FORM: ProductFormState = {
  name: "", price: 0, images: [],
  stockQuantity: 0,
  description: "", isArchive: false,
  colors: [], size: [], category: [],
};

 
//  skeleton 
 
function FieldSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-4 w-24 bg-[#f2f0ed] rounded animate-pulse" />
      <div className="h-[45px] w-full bg-[#f2f0ed] rounded animate-pulse" />
    </div>
  );
}
 
//  image upload section (Cloudinary) 
 
interface FileUploadState {
  file:     File;
  preview:  string;
  progress: number;
  error:    string | null;
}
 
interface ImageSectionProps {
  images:   string[];
  onChange: (images: string[]) => void;
}
 
function ImageSection({ images, onChange }: ImageSectionProps) {
  const inputRef                              = useRef<HTMLInputElement>(null);
  const [pending, setPending]                 = useState<FileUploadState[]>([]);
 
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const preview = URL.createObjectURL(file);
      const entry: FileUploadState = { file, preview, progress: 0, error: null };
 
      setPending((prev) => [...prev, entry]);
 
      uploadImageToCloudinary(file, (p: UploadProgress) => {
        setPending((prev) =>
          prev.map((e) => e.preview === preview ? { ...e, progress: p.percent } : e)
        );
      })
        .then((res) => {
          onChange([...images, res.secure_url]);
          setPending((prev) => prev.filter((e) => e.preview !== preview));
          URL.revokeObjectURL(preview);
        })
        .catch((err: Error) => {
          setPending((prev) =>
            prev.map((e) => e.preview === preview ? { ...e, error: err.message } : e)
          );
        });
    });
  };
 
  const removeUploaded = (index: number) => onChange(images.filter((_, i) => i !== index));
  const removePending  = (preview: string) => {
    URL.revokeObjectURL(preview);
    setPending((prev) => prev.filter((e) => e.preview !== preview));
  };
 
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };
 
  const hasAny = images.length > 0 || pending.length > 0;
 
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-[#17191c] font-dashboard_regular">
        Product Images
      </span>
 
      {hasAny && (
        <div className="grid grid-cols-4 gap-3">
          {/* committed images */}
          {images.map((src, i) => (
            <div key={src} className="relative group aspect-square border border-[#e8e6e3] overflow-hidden">
              <img src={src} alt={`product-${i}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeUploaded(i)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                aria-label="Remove image"
              >
                <Trash2 size={16} className="text-white" />
              </button>
            </div>
          ))}
 
          {/* in-flight uploads */}
          {pending.map((p) => (
            <div key={p.preview} className="relative aspect-square border border-[#e8e6e3] overflow-hidden">
              <img src={p.preview} alt="uploading" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/60">
                {p.error ? (
                  <>
                    <span className="text-[10px] text-red-600 text-center px-1">{p.error}</span>
                    <button
                      type="button"
                      onClick={() => removePending(p.preview)}
                      className="text-[10px] underline text-[#4c4c4c]"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <Loader2 size={16} className="animate-spin text-[#17191c]" />
                    <span className="text-[10px] text-[#4c4c4c]">{p.progress}%</span>
                  </>
                )}
              </div>
            </div>
          ))}
 
          {/* add more tile */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-[#e8e6e3] flex flex-col items-center justify-center gap-1 hover:border-[#17191c] hover:bg-[#fafaf9] transition-colors"
          >
            <ImagePlus size={18} className="text-[#a3a6af]" />
            <span className="text-xs text-[#a3a6af]">Add</span>
          </button>
        </div>
      )}
 
      {!hasAny && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-[#e8e6e3] h-[130px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#17191c] hover:bg-[#fafaf9] transition-colors"
        >
          <Upload size={20} className="text-[#a3a6af]" />
          <p className="text-sm text-[#777b86] font-selleasy_normal">
            Drag & drop or <span className="text-[#17191c] font-semibold">browse</span>
          </p>
          <p className="text-xs text-[#a3a6af]">PNG, JPG, WebP — uploaded to Cloudinary CDN</p>
        </div>
      )}
 
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
//  tag Input (colors, sizes, categories) 

interface TagInputProps {
  label:       string;
  placeholder: string;
  tags:        string[];
  onChange:    (tags: string[]) => void;
}

function TagInput({ label, placeholder, tags, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setDraft("");
  };

  const remove = (index: number) => onChange(tags.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-[#17191c] font-dashboard_regular">{label}</span>
      <div className="border-[#e8e6e3] py-2 flex flex-wrap gap-2 min-h-[45px] focus-within:border-[#17191c] transition-colors">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f2f0ed] text-xs text-[#17191c] font-semibold"
          >
            {tag}
            <button type="button" onClick={() => remove(i)} aria-label={`Remove ${tag}`}>
              <X size={10} />
            </button>
          </span>
        ))}
        <Input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
            if (e.key === "Backspace" && !draft && tags.length > 0) remove(tags.length - 1);
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] text-sm outline-none bg-transparent font-selleasy_normal"
        />
      </div>
      <p className="text-xs text-[#a3a6af]">Press Enter or comma to add</p>
    </div>
  );
}

//  color / size pair Input 

interface PairTagInputProps {
  label:    string;
  pairs:    ProductColorOrSize[];
  onChange: (pairs: ProductColorOrSize[]) => void;
}

function PairTagInput({ label, pairs, onChange }: PairTagInputProps) {
  const [draftName,  setDraftName]  = useState("");
  const [draftValue, setDraftValue] = useState("");

  const add = () => {
    const name  = draftName.trim();
    const value = draftValue.trim();
    if (!name || !value) return;
    onChange([...pairs, { name, value }]);
    setDraftName("");
    setDraftValue("");
  };

  const remove = (index: number) => onChange(pairs.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-[#17191c] font-dashboard_regular">{label}</span>

      {pairs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pairs.map((p, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2 py-1 border border-[#e8e6e3] text-xs text-[#17191c]"
            >
              {p.value && (
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-[#e8e6e3]"
                  style={{ backgroundColor: p.value }}
                />
              )}
              {p.name}
              <button type="button" onClick={() => remove(i)} aria-label={`Remove ${p.name}`}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Name (e.g. Red)"
          className="flex-1 h-[38px] border border-[#e8e6e3] px-3 text-sm outline-none focus:border-[#17191c] transition-colors font-selleasy_normal"
        />
        <Input
          type="text"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          placeholder="Value (e.g. #FF0000)"
          className="flex-1 h-[38px] border border-[#e8e6e3] px-3 text-sm outline-none focus:border-[#17191c] transition-colors font-selleasy_normal"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <button
          type="button"
          onClick={add}
          className="h-[38px] px-3 border border-[#e8e6e3] text-sm text-[#17191c] hover:bg-[#f2f0ed] transition-colors font-dashboard_regular"
        >
          Add
        </button>
      </div>
    </div>
  );
}

//  quill modules (stable reference) 

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline"],
    ["link"],
    [{ list: "ordered" }, { list: "bullet" }],
  ],
};

const SANITIZE_CONFIG = {
  allowedTags:       ["p", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2"],
  allowedAttributes: { a: ["href"] },
  disallowedTagsMode: "discard" as const,
};

//  modal 

const ProductModal = () => {
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const { open: isOpen, id: productId } = useSelector(
    (state: { modals: { product: { open: boolean; id: string | null } } }) => state.modals.product
  );
  const { id: storeId } = useParams();
  const dispatch        = useDispatch();

  const { data: productResponse, isLoading: loadingProduct } = useGetProductQuery(
    productId!, { skip: !productId }
  );
  const productData = productResponse?.data;

  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();

  // populate form when editing
  useEffect(() => {
    if (productData) {
      setForm({
        name:           productData.name           ?? "",
        price:          productData.price           ?? 0,
        images:         productData.images          ?? [],
        stockQuantity: productData.availableStock  ?? 0,
        description:    productData.description     ?? "",
        isArchive:      productData.isArchive       ?? false,
        category:       productData.category        ?? [],
        colors:         (productData.colors ?? []).map((c: ProductColorOrSize) => ({ name: c.name ?? "", value: c.value ?? "" })),
        size:           (productData.size   ?? []).map((s: ProductColorOrSize) => ({ name: s.name ?? "", value: s.value ?? "" })),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [productData]);

  const setField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleDescription = (html: string) =>
    setField("description", sanitizeHtml(html, SANITIZE_CONFIG));

  const handleSave = async () => {
    try {
      if (productId) {
        const result = await updateProduct({ id: productId, ...form }).unwrap();
        toast.success(`${result.data?.name} updated successfully!`);
      } else {
        const result = await createProduct({ storeid: storeId!, ...form }).unwrap();
        toast.success(`${result.data?.name} created successfully!`);
      }
      setTimeout(() => dispatch(closeProductModal()), 300);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  const isBusy = creating || updating;
  const isEdit = Boolean(productId);

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-end z-50 p-4">
      <motion.div
        variants={slideRight}
        initial="initial"
        animate={isOpen ? "enter" : "exit"}
        exit="exit"
        className="bg-white w-full rounded-2xl overflow-hidden relative flex flex-col lg:w-[750px] h-[95vh]"
      >
        {/* header */}
        <div className="border-b flex items-center justify-between px-8 h-[72px] shrink-0">
          <div>
            <h4 className="text-base font-semibold text-[#17191c] font-dashboard_regular">
              {isEdit ? "Edit Product" : "Create Product"}
            </h4>
            <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5">
              {isEdit
                ? "Update your product details, pricing, and availability."
                : "Fill in the details below to add a new product to your store."}
            </p>
          </div>
          <button
            onClick={() => dispatch(closeProductModal())}
            className="w-9 h-9 flex items-center justify-center hover:bg-[#f2f0ed] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <AnimatePresence mode="wait">
            {loadingProduct && isEdit ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <FieldSkeleton key={i} />)}
                </div>
                <div className="h-[130px] bg-[#f2f0ed] rounded animate-pulse" />
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => <FieldSkeleton key={i} />)}
                </div>
                <div className="h-[200px] bg-[#f2f0ed] rounded animate-pulse" />
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                {/* titleprice */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Title"
                    id="name"
                    name="name"
                    placeholder="e.g. Ankara Wrap Dress"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                  <Input
                    label="Price (₦)"
                    id="price"
                    name="price"
                    type="number"
                    placeholder="0"
                    value={form.price}
                    onChange={(e) => setField("price", Number(e.target.value))}
                  />
                </div>

                {/* stock */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Available Stock"
                    id="availableStock"
                    name="availableStock"
                    type="number"
                    placeholder="0"
                    value={form.stockQuantity}
                    onChange={(e) => setField("stockQuantity", Number(e.target.value))}
                  />
                </div>

                {/* images */}
                <ImageSection
                  images={form.images}
                  onChange={(imgs) => setField("images", imgs)}
                />

                {/* category */}
                <TagInput
                  label="Categories"
                  placeholder="e.g. Women, Dresses"
                  tags={form.category}
                  onChange={(tags) => setField("category", tags)}
                />

                {/* colors */}
                <PairTagInput
                  label="Colors"
                  pairs={form.colors}
                  onChange={(pairs) => setField("colors", pairs)}
                />

                {/* sizes */}
                <PairTagInput
                  label="Sizes"
                  pairs={form.size}
                  onChange={(pairs) => setField("size", pairs)}
                />

                {/* description */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[#17191c] font-dashboard_regular">
                    Description
                  </span>
                  <div className="border border-[#e8e6e3] h-[220px] focus-within:border-[#17191c] transition-colors">
                    <ReactQuill
                      value={form.description}
                      onChange={handleDescription}
                      placeholder="Describe your product..."
                      modules={QUILL_MODULES}
                      className="w-full h-[178px] text-sm font-selleasy_normal"
                    />
                  </div>
                </div>

                {/* archive toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    role="checkbox"
                    aria-checked={form.isArchive}
                    onClick={() => setField("isArchive", !form.isArchive)}
                    className={`w-10 h-5 rounded-full transition-colors ${form.isArchive ? "bg-[#17191c]" : "bg-[#e8e6e3]"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mt-0.5 shadow transition-transform ${form.isArchive ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-[#4c4c4c] font-selleasy_normal">
                    Archive product (hidden from store)
                  </span>
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* footer */}
        <div className="border-t h-[68px] flex items-center justify-between px-8 shrink-0">
          <button
            onClick={() => dispatch(closeProductModal())}
            className="text-sm font-semibold text-[#4c4c4c] hover:text-[#17191c] transition-colors font-dashboard_regular"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isBusy}
            className="bg-[var(--dark-1)] rounded-full text-white text-sm px-6 h-9 flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity font-dashboard_regular"
          >
            {isBusy
              ? isEdit ? "Updating..." : "Saving..."
              : isEdit ? "Update product" : "Save product"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductModal;