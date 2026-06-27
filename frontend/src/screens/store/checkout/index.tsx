import AuthLayout from "@/screens/auth/shared/AuthLayout";
import CheckoutShippingStep from "./CheckoutShippingStep";
import CheckoutPaymentStep  from "./CheckoutPaymentStep";
import { useCheckout, STEP_LABELS, STEP_MAP } from "./useCheckout";

export default function Checkout() {
  const {
    step, setStep,
    gateway, setGateway,
    navigate,
    handleShipping,
    handlePayment,
    checkingOut,
    addingShipping,
    paying,
  } = useCheckout();

  return (
    <AuthLayout
      stepLabels={STEP_LABELS}
      currentStep={STEP_MAP[step]}
      leftContent={
        <div className="flex flex-col gap-3">
          <h2
            className="text-3xl lg:text-4xl leading-tight"
            style={{ color: "#17191c", letterSpacing: "-0.3px" }}
          >
            Almost there.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "#6b7280" }}>
            {step === "shipping"
              ? "Enter your delivery address and we'll get your order on its way."
              : "Choose how you'd like to pay. Your order is reserved and ready."}
          </p>
        </div>
      }
    >
      {step === "shipping" && (
        <CheckoutShippingStep
          onSubmit={handleShipping}
          isLoading={checkingOut || addingShipping}
          onBack={() => navigate(-1)}
        />
      )}
      {step === "payment" && (
        <CheckoutPaymentStep
          gateway={gateway}
          onSelect={setGateway}
          onPay={handlePayment}
          onBack={() => setStep("shipping")}
          isLoading={paying}
        />
      )}
    </AuthLayout>
  );
}