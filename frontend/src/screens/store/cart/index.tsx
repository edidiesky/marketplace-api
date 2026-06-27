import { useParams, useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, ArrowRight } from "lucide-react";
import {
  useGetCartQuery,
  useUpdateCartItemMutation,
  useDeleteCartItemMutation,
} from "@/redux/services/cartApi";
import toast from "react-hot-toast";
import type { CartItem } from "@/types/api";
import Skeleton from "react-loading-skeleton";

//  CartRow 

function CartRow({
  item,
  onUpdateQty,
  onDelete,
}: {
  item: CartItem;
  onUpdateQty: (productId: string, qty: number) => void;
  onDelete:    (productId: string) => void;
}) {
  return (
    <tr className="border-b border-[#f0efec] last:border-0">
      {/* product */}
      <td className="py-5 pr-4">
        <div className="flex items-center gap-4">
          <div className="w-[90px] h-[90px] shrink-0 overflow-hidden bg-[#f4f3ee]">
            {item.productImage?.[0] ? (
              <img
                src={item.productImage[0]}
                alt={item.productTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#ccc] text-sm">
                No img
              </div>
            )}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-base lg:text-lg bold text-[#171717] truncate max-w-[200px]">
              {item.productTitle}
            </p>
            {item.availabilityStatus === "unavailable" && (
              <p className="text-sm text-red-500">
                {item.unavailabilityReason ?? "Out of stock"}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* unit price */}
      <td className="py-5 pr-4 text-base lg:text-lg text-[#555] whitespace-nowrap">
        ₦{item.productPrice.toLocaleString("en-NG")}
      </td>

      {/* quantity */}
      <td className="py-5 pr-4">
        <div className="flex items-center border border-black/10 rounded-full overflow-hidden w-fit">
          <button
            onClick={() => onUpdateQty(item.productId, Math.max(1, item.productQuantity - 1))}
            className="w-9 h-9 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors"
          >
            <Minus size={12} />
          </button>
          <span className="w-9 text-center text-base lg:text-lg bold">
            {item.productQuantity}
          </span>
          <button
            onClick={() => onUpdateQty(item.productId, item.productQuantity + 1)}
            className="w-9 h-9 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
      </td>

      {/* subtotal */}
      <td className="py-5 pr-4 text-base lg:text-lg bold text-[#171717] whitespace-nowrap">
        ₦{(item.productPrice * item.productQuantity).toLocaleString("en-NG")}
      </td>

      {/* remove */}
      <td className="py-5">
        <button
          onClick={() => onDelete(item.productId)}
          className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#f0efec] text-[#aaa] hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

//  OrderSummary 

function OrderSummary({
  itemCount,
  total,
  onCheckout,
  onContinue,
}: {
  itemCount:   number;
  total:       number;
  onCheckout:  () => void;
  onContinue:  () => void;
}) {
  return (
    <div className="border border-[#e8e6e3] p-6 flex flex-col gap-6 bg-white">
      <h3 className="text-lg lg:text-2xl bold text-[#171717]">Cart Totals</h3>

      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center py-3 border-b border-[#f0efec]">
          <span className="text-base lg:text-lg text-[#555]">
            Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})
          </span>
          <span className="text-base lg:text-lg bold text-[#171717]">
            ₦{total.toLocaleString("en-NG")}
          </span>
        </div>
        <div className="flex justify-between items-center py-3 border-b border-[#f0efec]">
          <span className="text-base lg:text-lg text-[#555]">Shipping</span>
          <span className="text-base lg:text-lg text-[#999]">Calculated at checkout</span>
        </div>
        <div className="flex justify-between items-center py-3">
          <span className="text-base lg:text-lg  text-[#171717]">Total</span>
          <span className="text-base lg:text-lg  text-[#171717]">
            ₦{total.toLocaleString("en-NG")}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onCheckout}
          className="w-full h-12 rounded-full bg-[#171717] text-white text-base lg:text-lg bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          Proceed to Checkout
        </button>
        <button
          onClick={onContinue}
          className="w-full h-12 rounded-full border border-black/10 text-base lg:text-lg bold hover:bg-[#f4f3ee] transition-colors"
        >
          Continue shopping
        </button>
      </div>
    </div>
  );
}

//  Cart (page) 

export default function Cart() {
  const { id: storeId, cartId } = useParams<{ id: string; cartId: string }>();
  const navigate = useNavigate();

  const { data: cartData, isLoading } = useGetCartQuery(cartId ?? "", { skip: !cartId });
  const [updateItem] = useUpdateCartItemMutation();
  const [deleteItem] = useDeleteCartItemMutation();

  const cart = cartData?.data;

  const handleUpdateQty = async (productId: string, quantity: number) => {
    if (!storeId) return;
    try {
      await updateItem({ storeId, productId, quantity }).unwrap();
    } catch {
      toast.error("Failed to update quantity");
    }
  };

  const handleDelete = async (productId: string) => {
    if (!storeId) return;
    try {
      await deleteItem({ storeId, productId }).unwrap();
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const items      = cart?.cartItems ?? [];
  const totalPrice = cart?.totalPrice ?? 0;

  return (
    <div className="w-full min-h-screen bg-[#FAF8F5] py-16">
      <div className="w-[95%] max-w-7xl mx-auto">

        <h1 className="text-4xl bold text-[#171717] mb-10">
          My Shopping Cart
        </h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <p className="text-sm text-[#666]">Your cart is empty.</p>
            <button
              onClick={() => navigate(`/store/${storeId}`)}
              className="h-10 px-6 bg-[#171717] text-white text-sm bold rounded-full hover:opacity-90 transition-opacity"
            >
              Continue shopping
            </button>
          </div>
        ) : (
          /* two-column layout: table left, summary right */
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] items-start">

            {/*  item table  */}
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse min-w-[560px]">
                <thead>
                  <tr className="border-b border-[#e8e6e3]">
                    {["Product", "Price", "Quantity", "Subtotal", ""].map((h) => (
                      <th
                        key={h}
                        className="pb-4 text-left text-sm text-[#a3a6af] uppercase tracking-widest pr-4"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: CartItem) => (
                    <CartRow
                      key={item.productId}
                      item={item}
                      onUpdateQty={handleUpdateQty}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/*  sticky order summary  */}
            <div className="lg:sticky lg:top-24">
              <OrderSummary
                itemCount={items.length}
                total={totalPrice}
                onCheckout={() => navigate(`/store/${storeId}/checkout/${cartId}`)}
                onContinue={() => navigate(`/store/${storeId}`)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}