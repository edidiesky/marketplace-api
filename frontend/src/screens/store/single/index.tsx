import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Star, Minus, Plus, ShoppingCart, ArrowLeft } from "lucide-react";
import { useGetProductQuery } from "@/redux/services/productApi";
import { useAddToCartMutation } from "@/redux/services/cartApi";
import { useGetProductReviewsQuery } from "@/redux/services/reviewApi";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import toast from "react-hot-toast";
import Skeleton from "react-loading-skeleton";
import ProductDescription from "./ProductDescription";
import ProductReview from "./ProductReview";
import SimilarProduct from "./SimiliarProduct";

export default function StoreSingleProduct() {
  const { id: storeId, productId } = useParams<{ id: string; productId: string }>();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: productData, isLoading } = useGetProductQuery(productId ?? "", { skip: !productId });
  const { data: reviewData } = useGetProductReviewsQuery(productId ?? "", { skip: !productId });
  const [addToCart, { isLoading: addingToCart }] = useAddToCartMutation();

  const product = productData?.data;
  const reviews = reviewData?.data ?? [];

  const handleAddToCart = async () => {
    if (!currentUser) {
      navigate("/login", { state: { from: { pathname: `/store/${storeId}/product/${productId}` } } });
      return;
    }
    if (!storeId || !productId) return;
    try {
      const result = await addToCart({ storeId, items: [{ productId, quantity }] }).unwrap();
      toast.success("Added to cart");
      navigate(`/store/${storeId}/cart/${result.data._id}`);
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 grid lg:grid-cols-2 gap-16">
        <Skeleton className="w-full aspect-square" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">

        <button
          onClick={() => navigate(`/store/${storeId}`)}
          className="flex items-center gap-2 text-sm text-[#666] hover:text-[#171717] mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to store
        </button>

        <div className="grid lg:grid-cols-2 gap-16">
          <div className="flex flex-col gap-4">
            <div className="w-full aspect-square overflow-hidden bg-[#f4f3ee]">
              <img
                src={product.images?.[selectedImage] ?? ""}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 overflow-hidden border-2 transition-colors ${selectedImage === i ? "border-[#171717]" : "border-transparent"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#171717]">{product.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="text-sm text-[#666]">({reviews.length} reviews)</span>
              </div>
            </div>

            <p className="text-3xl font-bold text-[#171717]">₦{product.price.toLocaleString("en-NG")}</p>

            <p className="text-sm text-[#666] leading-relaxed">{product.description}</p>

            {product.colors?.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-[#171717]">Colors</span>
                <div className="flex items-center gap-2">
                  {product.colors.map((c, i) => (
                    <div
                      key={i}
                      style={{ backgroundColor: c.value }}
                      className="w-7 h-7 border border-black/10 cursor-pointer hover:scale-110 transition-transform"
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {product.size?.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-[#171717]">Sizes</span>
                <div className="flex items-center gap-2">
                  {product.size.map((s, i) => (
                    <div key={i} className="px-3 py-1.5 border border-black/10 text-xs font-semibold text-[#171717] cursor-pointer hover:bg-[#f4f3ee] transition-colors">
                      {s.value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.category?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.category.map((cat) => (
                  <span key={cat} className="px-3 py-1 bg-[#f4f3ee] text-xs font-medium text-[#444]">
                    {cat}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center border border-black/10 overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors">
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="flex-1 h-12 bg-[#171717] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <ShoppingCart size={16} />
                {addingToCart ? "Adding..." : "Add to Cart"}
              </button>
            </div>

            <button
              onClick={() => navigate(`/store/${storeId}/reviews/${productId}`)}
              className="text-sm text-[#666] underline underline-offset-4 text-left w-fit hover:text-[#171717] transition-colors"
            >
              View all {reviews.length} reviews
            </button>
          </div>
        </div>

        <ProductDescription product={product} />
        <ProductReview productId={productId ?? ""} />
        <SimilarProduct currentProductId={productId ?? ""} />

      </div>
    </div>
  );
}