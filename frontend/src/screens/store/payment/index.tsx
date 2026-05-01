// src/screens/store/payment/index.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, ArrowRight, MapPin } from "lucide-react";
import { useGetCartQuery, useUpdateCartItemMutation, useDeleteCartItemMutation } from "@/redux/services/cartApi";
import { useCheckoutMutation, useAddShippingMutation } from "@/redux/services/orderApi";
import { useInitializePaymentMutation } from "@/redux/services/paymentApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import type { ShippingAddress, CartItem } from "@/types/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const shippingSchema = z.object({
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().optional(),
});

type ShippingForm = z.infer<typeof shippingSchema>;

type Step = "cart" | "shipping" | "payment";

export default function StoreCart() {
  const { id: storeId, cartId } = useParams<{
    id: string;
    cartId: string;
  }>();
  // const navigate = useNavigate();
  const [step, setStep] = useState<Step>("cart");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [gateway, setGateway] = useState<"paystack" | "flutterwave">(
    "paystack"
  );

  const { data: cartData, isLoading } = useGetCartQuery(cartId ?? "", {
    skip: !cartId,
  });
  const [updateItem] = useUpdateCartItemMutation();
  const [deleteItem] = useDeleteCartItemMutation();
  const [checkout, { isLoading: checkingOut }] = useCheckoutMutation();
  const [addShipping, { isLoading: addingShipping }] = useAddShippingMutation();
  const [initializePayment, { isLoading: paying }] =
    useInitializePaymentMutation();

  const cart = cartData?.data;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingForm>({
    resolver: zodResolver(shippingSchema),
  });

  const handleUpdateQuantity = async (
    productId: string,
    quantity: number
  ) => {
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

  const handleCheckout = async () => {
    if (!storeId || !cartId) return;
    try {
      const result = await checkout({
        storeId,
        cartId,
        requestId: crypto.randomUUID(),
      }).unwrap();
      setOrderId(result.data._id);
      setStep("shipping");
    } catch {
      toast.error("Checkout failed. Please try again.");
    }
  };

  const handleShipping = async (data: ShippingForm) => {
    if (!orderId) return;
    try {
      await addShipping({
        orderId,
        shippingAddress: data as ShippingAddress,
      }).unwrap();
      setStep("payment");
    } catch {
      toast.error("Failed to save shipping address.");
    }
  };

  const handlePayment = async () => {
    if (!orderId) return;
    // const callbackUrl = `${window.location.origin}/payment/callback`;
    try {
      const result = await initializePayment({
        orderId,
        gateway,
      }).unwrap();
      if (result.data.redirectUrl) {
        window.location.href = result.data.redirectUrl;
      }
    } catch {
      toast.error("Payment initialization failed.");
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: "cart", label: "Cart" },
    { key: "shipping", label: "Shipping" },
    { key: "payment", label: "Payment" },
  ];

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 text-sm font-medium ${
                  step === s.key
                    ? "text-[#171717]"
                    : steps.findIndex((x) => x.key === step) > i
                    ? "text-emerald-600"
                    : "text-[#aaa]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s.key
                      ? "bg-[#171717] text-white"
                      : steps.findIndex((x) => x.key === step) > i
                      ? "bg-emerald-600 text-white"
                      : "bg-[#e5e5e5] text-[#aaa]"
                  }`}
                >
                  {i + 1}
                </div>
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <div className="w-8 h-[1px] bg-[#e5e5e5]" />
              )}
            </div>
          ))}
        </div>

        {/* Step: Cart */}
        {step === "cart" && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-[#171717]">Your Cart</h1>

            {!cart?.items?.length ? (
              <div className="text-center py-20 text-[#666]">
                Your cart is empty.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {cart.items.map((item: CartItem) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-4 bg-white rounded-xl p-4 border border-black/5"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#f4f3ee] shrink-0">
                        {item.images?.[0] && (
                          <img
                            src={item.images[0]}
                            alt={item.productTitle}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#171717]">
                          {item.productTitle}
                        </p>
                        <p className="text-sm text-[#666]">
                          ₦{item.price.toLocaleString()}
                        </p>
                        {item.availabilityStatus === "unavailable" && (
                          <p className="text-xs text-destructive mt-1">
                            {item.unavailabilityReason ?? "Out of stock"}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center border rounded-full overflow-hidden">
                        <button
                          onClick={() =>
                            handleUpdateQuantity(
                              item.productId,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleUpdateQuantity(
                              item.productId,
                              item.quantity + 1
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#f4f3ee] transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-[#171717] w-20 text-right">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                      <button
                        onClick={() => handleDeleteItem(item.productId)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#fee2e2] text-[#aaa] hover:text-destructive transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl p-6 border border-black/5">
                  <div className="flex justify-between text-sm text-[#666] mb-2">
                    <span>Subtotal</span>
                    <span>₦{cart.totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#171717] text-base border-t pt-3 mt-3">
                    <span>Total</span>
                    <span>₦{cart.totalPrice.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="w-full h-12 rounded-full bg-[#171717] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {checkingOut ? "Processing..." : "Proceed to Checkout"}
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Step: Shipping */}
        {step === "shipping" && (
          <form
            onSubmit={handleSubmit(handleShipping)}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-[#171717]" />
              <h1 className="text-2xl font-bold text-[#171717]">
                Shipping Address
              </h1>
            </div>

            <div className="bg-white rounded-xl p-6 border border-black/5 flex flex-col gap-4">
              <Input
                label="Street address"
                error={errors.street?.message}
                placeholder="123 Main Street"
                {...register("street")}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  error={errors.city?.message}
                  placeholder="Lagos"
                  {...register("city")}
                />
                <Input
                  label="State"
                  error={errors.state?.message}
                  placeholder="Lagos State"
                  {...register("state")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Country"
                  error={errors.country?.message}
                  placeholder="Nigeria"
                  {...register("country")}
                />
                <Input
                  label="Postal code (optional)"
                  placeholder="100001"
                  {...register("postalCode")}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={addingShipping}
              className="w-full h-12 rounded-full bg-[#171717] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {addingShipping ? "Saving..." : "Continue to Payment"}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Step: Payment */}
        {step === "payment" && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-[#171717]">
              Choose Payment Method
            </h1>

            <div className="flex flex-col gap-3">
              {(["paystack", "flutterwave"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGateway(g)}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-colors ${
                    gateway === g
                      ? "border-[#171717] bg-white"
                      : "border-black/5 bg-white hover:border-black/20"
                  }`}
                >
                  <p className="text-sm font-semibold capitalize text-[#171717]">
                    {g}
                  </p>
                  <p className="text-xs text-[#666] mt-0.5">
                    {g === "paystack"
                      ? "Pay with card, bank transfer, or USSD"
                      : "Pay with card, mobile money, or bank transfer"}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={handlePayment}
              disabled={paying}
              className="w-full h-12 rounded-full bg-[#171717] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {paying ? "Redirecting..." : `Pay with ${gateway}`}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}