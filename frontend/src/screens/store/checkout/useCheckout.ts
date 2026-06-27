import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCheckoutMutation, useAddShippingMutation } from "@/redux/services/orderApi";
import { useInitializePaymentMutation } from "@/redux/services/paymentApi";
import toast from "react-hot-toast";
import { z } from "zod/v4";

export const shippingSchema = z.object({
  fullName:   z.string().min(1, "Full name is required"),
  email:      z.string().email("Valid email is required"),
  address:    z.string().min(1, "Address is required"),
  city:       z.string().min(1, "City is required"),
  state:      z.string().min(1, "State is required"),
  country:    z.string().min(1, "Country is required"),
  phone:      z.string().min(1, "Phone number is required"),
  postalCode: z.string().optional(),
});

export type ShippingForm = z.infer<typeof shippingSchema>;
export type Gateway      = "paystack" | "flutterwave";
export type Step         = "shipping" | "payment";

export const STEP_LABELS: string[]            = ["Shipping address", "Payment method"];
export const STEP_MAP:    Record<Step, number> = { shipping: 1, payment: 2 };

interface CustomerInfo { name: string; phone: string; email: string; }

export function useCheckout() {
  const { id: storeId, cartId } = useParams<{ id: string; cartId: string }>();
  const navigate    = useNavigate();

  const [step,         setStep]        = useState<Step>("shipping");
  const [orderId,      setOrderId]     = useState<string | null>(null);
  const [gateway,      setGateway]     = useState<Gateway>("paystack");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const [checkout,          { isLoading: checkingOut    }] = useCheckoutMutation();
  const [addShipping,       { isLoading: addingShipping }] = useAddShippingMutation();
  const [initializePayment, { isLoading: paying         }] = useInitializePaymentMutation();

  const handleShipping = async (data: ShippingForm) => {
    if (!storeId || !cartId) return;
    try {
      const result = await checkout({
        storeId,
        cartId,
        requestId: crypto.randomUUID(),
      }).unwrap();

      const newOrderId = result.data.orderId ?? result.data._id ?? "";
      sessionStorage.setItem("pending_order_id", newOrderId);

      await addShipping({ orderId: newOrderId, ...data }).unwrap();
      setCustomerInfo({ name: data.fullName, phone: data.phone, email: data.email });
      setOrderId(newOrderId);
      setStep("payment");
    } catch {
      toast.error("Failed to process. Please try again.");
    }
  };

  const handlePayment = async () => {
    if (!orderId) return;

    const customerEmail = customerInfo?.email ?? "";
    const customerName  = customerInfo?.name ?? "";

    if (!customerEmail) {
      toast.error("Please complete the shipping step first.");
      return;
    }

    try {
      const result = await initializePayment({
        orderId,
        gateway,
        customerEmail,
        customerName,
        phone:    customerInfo?.phone,
        currency: "NGN",
      }).unwrap();

      if (result.data.redirectUrl) {
        window.location.href = result.data.redirectUrl;
      }
    } catch {
      toast.error("Payment initialization failed.");
    }
  };

  return {
    step, setStep,
    gateway, setGateway,
    navigate,
    handleShipping,
    handlePayment,
    checkingOut,
    addingShipping,
    paying,
  };
}