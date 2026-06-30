import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import sanitizeHtml from "sanitize-html";
import {
  Minus,
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ReactHtmlParser from "react-html-parser";

import { useGetProductQuery } from "@/redux/services/productApi";
import { useAddToCartMutation } from "@/redux/services/cartApi";
import { useGetProductReviewsQuery } from "@/redux/services/reviewApi";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import Skeleton from "react-loading-skeleton";
import ProductDescription from "./ProductDescription";
import ProductReview from "./ProductReview";
import SimilarProduct from "./SimiliarProduct";
import { showToast } from "@/components/common/Toast";

export default function StoreSingleProduct() {
  const { id: storeId, productId } = useParams<{
    id: string;
    productId: string;
  }>();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: productData, isLoading } = useGetProductQuery(productId ?? "", {
    skip: !productId,
  });
  const { data: reviewData } = useGetProductReviewsQuery(productId ?? "", {
    skip: !productId,
  });
  const [addToCart, { isLoading: addingToCart }] = useAddToCartMutation();

  const product = productData?.data;
  const reviews = reviewData?.data?.reviews ?? [];

  const sanitizedValue = sanitizeHtml(product?.description?.slice(0, 100) as string, {
          allowedTags: ["p", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2"],
          allowedAttributes: {
            a: ["href"],
          },
          disallowedTagsMode: "discard",
        });
 

  const images = product?.images ?? [];
  const prevImage = () =>
    setSelectedImage((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImage = () =>
    setSelectedImage((i) => (i === images.length - 1 ? 0 : i + 1));

  const handleAddToCart = async () => {
    if (!currentUser) {
      navigate("/login", { state: { from: { pathname: `/store/${storeId}/product/${productId}` } } });
      return;
    }
    if (!storeId || !productId || !product) return;
    try {
      const result = await addToCart({
        storeId,
        productId,
        productTitle:       product.name,
        productImage:       product.images ?? [],
        productPrice:       product.price,
        productDescription: product.description,
        quantity,
        sellerId:           product.ownerId ?? "",
      }).unwrap();
      showToast("Added to cart", "success");
      navigate(`/store/${storeId}/cart/${result.data.cartId ?? result.data._id}`);
    } catch {
      showToast("Failed to add to cart", "error");
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
          className="flex items-center gap-2 text-base bold text-[#666] hover:text-[#171717] mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to store
        </button>

        <div className="grid lg:grid-cols-[60%_40%] gap-16">
          <div className="flex items-start gap-10">
            {images.length > 1 && (
              <div className="flex flex-col gap-2 shrink-0">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 overflow-hidden border-2 rounded-2xl transition-colors bg-[#81807c86] shrink-0 ${
                      selectedImage === i
                        ? "border-[#171717] border-4"
                        : "border-transparent hover:border-[#ccc]"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 rounded-2xl aspect-square overflow-hidden bg-[#f0efec]">
              <img
                src={images[selectedImage] ?? ""}
                alt={product.name}
                className="w-full h-full object-cover"
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute rounded-full left-3 top-1/2 -translate-y-1/2 w-12 shadow-3xl h-12 bg-white/90 hover:bg-white flex items-center justify-center transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={24} className="text-[#333]" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute rounded-full right-3 top-1/2 -translate-y-1/2 w-12 shadow-3xl h-12 bg-white/90 hover:bg-white flex items-center justify-center transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight size={24} className="text-[#333]" />
                  </button>

                  {/* dot indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          selectedImage === i
                            ? "bg-[#171717]"
                            : "bg-[#171717]/30"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <h4 className="text-lg bold text-red-600">
                10+ views in 24 Hours
              </h4>
              <h1 className="text-4xl lg:text-5xl text-[#171717]">
                ₦{product.price.toLocaleString("en-NG")}
              </h1>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h4 className="text-base bold text-gray-600">
                  Local taxes included (where applicable)
                </h4>
                <p className="text-xl text-[#171717]">{product.name}</p>
                <p className="text-base text-[#171717] leading-relaxed">
                  {ReactHtmlParser(sanitizedValue)}
                </p>
              </div>

              {product.colors?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-lg bold text-[#171717]">
                    Colors Available
                  </span>
                  <div className="flex items-center gap-2">
                    {product.colors.map((c, i) => (
                      <div
                        key={i}
                        style={{ backgroundColor: c.value }}
                        className="w-10 h-10 rounded-full border border-black/10 cursor-pointer hover:scale-110 transition-transform"
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {product.size?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-lg bold text-[#171717]">Sizes</span>
                  <div className="flex items-center gap-2">
                    {product.size.map((s, i) => (
                      <div
                        key={i}
                        className="px-3 bold py-1.5 border border-black/10 text-base text-[#171717] cursor-pointer hover:bg-[#f4f3ee] transition-colors"
                      >
                        {s.value}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.category?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.category.map((cat) => (
                    <span
                      key={cat}
                      className="px-3 bold py-1 bg-[#f4f3ee] text-base  text-[#444]"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center rounded-full border border-black/10 overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-12 text-center text-base bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="flex-1 h-14 bg-[#171717] text-white text-base bold rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {addingToCart ? "Adding..." : "Add to Cart"}
                </button>
              </div>
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
