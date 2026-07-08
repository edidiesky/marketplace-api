import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { useGetProductQuery } from "@/redux/services/productApi";
import { useAddToCartMutation } from "@/redux/services/cartApi";
import { useGetProductReviewsQuery } from "@/redux/services/reviewApi";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import Skeleton from "react-loading-skeleton";
import ProductReview from "./ProductReview";
import SimilarProduct from "./SimiliarProduct";
import { showToast } from "@/components/common/Toast";
import ProductImage from "./ProductImage";
import ProductInfoAccordion from "./Productinfoaccordion";
import ProductPricePanel from "./ProductPricePanel";
import SellerProfileCard from "./SellerProfileCard";

export default function StoreSingleProduct() {
  const { id: storeId, productId } = useParams<{
    id: string;
    productId: string;
  }>();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [quantity, setQuantity] = useState(1);
  const { data: productData, isLoading } = useGetProductQuery(productId ?? "", {
    skip: !productId,
  });
  const { data: reviewData } = useGetProductReviewsQuery(productId ?? "", {
    skip: !productId,
  });

  const [addToCart, { isLoading: addingToCart }] = useAddToCartMutation();

  const product = productData?.data;
  const reviews = reviewData?.data?.reviews ?? [];

  const handleAddToCart = async () => {
    if (!currentUser) {
      navigate("/login", {
        state: { from: { pathname: `/store/${storeId}/product/${productId}` } },
      });
      return;
    }
    if (!storeId || !productId || !product) return;
    try {
      const result = await addToCart({
        storeId,
        productId,
        productTitle: product.name,
        productImage: product.images ?? [],
        productPrice: product.price,
        productDescription: product.description,
        quantity,
        sellerId: product.ownerId ?? "",
      }).unwrap();
      showToast("Added to cart", "success");
      navigate(
        `/store/${storeId}/cart/${result.data.cartId ?? result.data._id}`,
      );
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
      <div className="xl:max-w-7xl mx-auto py-12 lg:px-0 px-4">
        <button
          onClick={() => navigate(`/store/${storeId}`)}
          className="flex items-center gap-2 text-base bold text-[#666] hover:text-[#171717] mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to store
        </button>

        <div className="grid lg:grid-cols-[60%_40%] gap-16">
          {/* left section of single product */}
          <div className="flex w-full flex-col gap-8 lg:gap-16">
            <ProductImage images={product?.images ?? []} />
            <ProductReview
              productId={productId ?? ""}
              onViewAll={() =>
                navigate(`/store/${storeId}/reviews/${productId}`)
              }
            />
            <SellerProfileCard/>
          </div>

          {/* right section of single product */}
          <div className="w-full flex flex-col gap-8">
            <ProductPricePanel
              product={product}
              quantity={quantity}
              onIncrement={() => setQuantity((q) => q + 1)}
              onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
              onAddToCart={handleAddToCart}
              addingToCart={addingToCart}
              reviewsCount={reviews.length}
              onViewReviews={() =>
                navigate(`/store/${storeId}/reviews/${productId}`)
              }
            />
            <ProductInfoAccordion
              itemDetails={product.description ? [product.description] : []}
              shippingInfo={{
                processingTime: "7–10 business days",
                returnsAccepted: false,
                shippingCost: "USD 36.36",
                shipsFrom: "United States",
                deliverTo: "Nigeria",
              }}
              sellers={[
                {
                  id: "string",
                  name: "string",
                  avatarUrl: "string",
                  isStarSeller: true,
                  blurb: "string",
                },
              ]}
            />
          </div>
        </div>

        <SimilarProduct currentProductId={productId ?? ""} />
      </div>
    </div>
  );
}
