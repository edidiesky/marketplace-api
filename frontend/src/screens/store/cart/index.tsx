import { useParams, useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, ArrowRight, ShoppingCart } from "lucide-react";
import { useGetCartQuery, useUpdateCartItemMutation, useDeleteCartItemMutation } from "@/redux/services/cartApi";
import toast from "react-hot-toast";
import type { CartItem } from "@/types/api";
import Skeleton from "react-loading-skeleton";

export default function Cart() {
  const { id: storeId, cartId } = useParams<{ id: string; cartId: string }>();
  const navigate = useNavigate();

  const { data: cartData, isLoading } = useGetCartQuery(cartId ?? "", { skip: !cartId });
  const [updateItem] = useUpdateCartItemMutation();
  const [deleteItem] = useDeleteCartItemMutation();

  const cart = cartData?.data;

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    if (!cartId) return;
    try {
      await updateItem({ id: cartId, productId, quantity }).unwrap();
    } catch {
      toast.error("Failed to update quantity");
    }
  };

  const handleDeleteItem = async (productId: string) => {
    if (!cartId) return;
    try {
      await deleteItem({ id: cartId, productId }).unwrap();
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col gap-8">

        <div className="flex items-center gap-3">
          <ShoppingCart size={22} className="text-[#171717]" />
          <h1 className="text-2xl font-bold text-[#171717]">My Shopping Cart</h1>
        </div>

        {!cart?.items?.length ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <ShoppingCart size={40} className="text-[#ddd]" />
            <p className="text-sm text-[#666]">Your cart is empty.</p>
            <button
              onClick={() => navigate(`/store/${storeId}`)}
              className="h-10 px-6 bg-[#171717] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {cart.items.map((item: CartItem) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-4 bg-white p-4 border border-black/5"
                >
                  <div className="w-16 h-16 overflow-hidden bg-[#f4f3ee] shrink-0">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.productTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#aaa] text-xs">No img</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#171717] truncate">{item.productTitle}</p>
                    <p className="text-sm text-[#666]">₦{item.price.toLocaleString("en-NG")}</p>
                    {item.availabilityStatus === "unavailable" && (
                      <p className="text-xs text-red-500 mt-0.5">{item.unavailabilityReason ?? "Out of stock"}</p>
                    )}
                  </div>

                  <div className="flex items-center border border-black/10 overflow-hidden">
                    <button
                      onClick={() => handleUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <p className="text-sm font-bold text-[#171717] w-24 text-right whitespace-nowrap">
                    ₦{(item.price * item.quantity).toLocaleString("en-NG")}
                  </p>

                  <button
                    onClick={() => handleDeleteItem(item.productId)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-red-50 text-[#aaa] hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white border border-black/5 p-6 flex flex-col gap-3">
              <div className="flex justify-between text-sm text-[#666]">
                <span>{cart.items.length} item{cart.items.length !== 1 ? "s" : ""}</span>
                <span>₦{cart.totalPrice.toLocaleString("en-NG")}</span>
              </div>
              <div className="flex justify-between font-bold text-[#171717] text-base border-t pt-3">
                <span>Total</span>
                <span>₦{cart.totalPrice.toLocaleString("en-NG")}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate(`/store/${storeId}/checkout/${cartId}`)}
                className="w-full h-12 bg-[#171717] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                Proceed to Checkout
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate(`/store/${storeId}`)}
                className="w-full h-12 border border-black/10 text-sm font-medium hover:bg-[#f4f3ee] transition-colors"
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}