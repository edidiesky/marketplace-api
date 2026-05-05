import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { useCheckoutMutation, useAddShippingMutation } from "@/redux/services/orderApi";
import { useInitializePaymentMutation } from "@/redux/services/paymentApi";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import type { ShippingAddress } from "@/types/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";

const shippingSchema = z.object({
  street:     z.string().min(1, "Street is required"),
  city:       z.string().min(1, "City is required"),
  state:      z.string().min(1, "State is required"),
  country:    z.string().min(1, "Country is required"),
  postalCode: z.string().optional(),
});

type ShippingForm = z.infer<typeof shippingSchema>;
type Step = "shipping" | "payment";

export default function Checkout() {
  const { id: storeId, cartId } = useParams<{ id: string; cartId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("shipping");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [gateway, setGateway] = useState<"paystack" | "flutterwave">("paystack");

  const [checkout, { isLoading: checkingOut }] = useCheckoutMutation();
  const [addShipping, { isLoading: addingShipping }] = useAddShippingMutation();
  const [initializePayment, { isLoading: paying }] = useInitializePaymentMutation();

  const { register, handleSubmit, formState: { errors } } = useForm<ShippingForm>({
    resolver: zodResolver(shippingSchema),
  });

  const steps: { key: Step; label: string }[] = [
    { key: "shipping", label: "Shipping" },
    { key: "payment",  label: "Payment"  },
  ];

  const handleShipping = async (data: ShippingForm) => {
    if (!storeId || !cartId) return;
    try {
      const result = await checkout({
        storeId,
        cartId,
        requestId: crypto.randomUUID(),
      }).unwrap();
      const newOrderId = result.data._id;
      sessionStorage.setItem("pending_order_id", newOrderId);
      await addShipping({
        orderId: newOrderId,
        shippingAddress: data as ShippingAddress,
      }).unwrap();
      setOrderId(newOrderId);
      setStep("payment");
    } catch {
      toast.error("Failed to process. Please try again.");
    }
  };

  const handlePayment = async () => {
    if (!orderId) return;
    try {
      const result = await initializePayment({ orderId, gateway }).unwrap();
      if (result.data.redirectUrl) {
        window.location.href = result.data.redirectUrl;
      }
    } catch {
      toast.error("Payment initialization failed.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fafafa]">
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col gap-8">

        <div className="flex items-center gap-3 mb-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 text-sm font-medium ${step === s.key ? "text-[#171717]" : "text-[#aaa]"}`}>
                <div className={`w-6 h-6 flex items-center justify-center text-xs font-bold ${step === s.key ? "bg-[#171717] text-white" : "bg-[#e5e5e5] text-[#aaa]"}`}>
                  {i + 1}
                </div>
                {s.label}
              </div>
              {i < steps.length - 1 && <div className="w-8 h-px bg-[#e5e5e5]" />}
            </div>
          ))}
        </div>

        {step === "shipping" && (
          <form onSubmit={handleSubmit(handleShipping)} className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-[#171717]" />
              <h1 className="text-2xl font-bold text-[#171717]">Shipping Address</h1>
            </div>

            <div className="bg-white border border-black/5 p-6 flex flex-col gap-4">
              <Input
                label="Street address"
                error={errors.street?.message}
                placeholder="123 Main Street"
                {...register("street")}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City"  error={errors.city?.message}  placeholder="Lagos"       {...register("city")}  />
                <Input label="State" error={errors.state?.message} placeholder="Lagos State" {...register("state")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Country" error={errors.country?.message} placeholder="Nigeria" {...register("country")} />
                <Input label="Postal code (optional)" placeholder="100001" {...register("postalCode")} />
              </div>
            </div>

            <button
              type="submit"
              disabled={checkingOut || addingShipping}
              className="w-full h-12 bg-[#171717] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {checkingOut || addingShipping ? "Processing..." : "Continue to Payment"}
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full h-12 border border-black/10 text-sm font-medium hover:bg-[#f4f3ee] transition-colors"
            >
              Back to cart
            </button>
          </form>
        )}

        {step === "payment" && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-[#171717]">Choose Payment Method</h1>

            <div className="flex flex-col gap-3">
              {(["paystack", "flutterwave"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGateway(g)}
                  className={`w-full p-5 border-2 text-left transition-colors ${
                    gateway === g ? "border-[#171717] bg-white" : "border-black/5 bg-white hover:border-black/20"
                  }`}
                >
                  <p className="text-sm font-semibold capitalize text-[#171717]">{g}</p>
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
              className="w-full h-12 bg-[#171717] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
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