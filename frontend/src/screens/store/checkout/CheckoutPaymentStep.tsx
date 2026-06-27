import type { Gateway } from "./useCheckout";

interface Props {
  gateway:    Gateway;
  onSelect:   (g: Gateway) => void;
  onPay:      () => Promise<void>;
  onBack:     () => void;
  isLoading:  boolean;
}

const GATEWAYS: { id: Gateway; description: string }[] = [
  { id: "paystack",    description: "Pay with card, bank transfer, or USSD"           },
  { id: "flutterwave", description: "Pay with card, mobile money, or bank transfer"   },
];

export default function CheckoutPaymentStep({ gateway, onSelect, onPay, onBack, isLoading }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
           <h1 className="text-2xl lg:text-3xl">
            Payment Method
          </h1>
        </div>
        <p className="text-base bold" style={{ color: "#6b7280" }}>
          Choose how you'd like to complete your purchase.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {GATEWAYS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g.id)}
            className="w-full  p-4 border-2 text-left transition-all rounded-2xl"
            style={{
              borderColor:     gateway === g.id ? "#17191c" : "#e8e6e3",
              backgroundColor: gateway === g.id ? "#fafaf9" : "#fff",
            }}
          >
            <p className="text-base bold capitalize" style={{ color: "#17191c" }}>
              {g.id}
            </p>
            <p className="text-base mt-0.5" style={{ color: "#6b7280" }}>
              {g.description}
            </p>
          </button>
        ))}
      </div>

      <button
        onClick={onPay}
        disabled={isLoading}
        className="w-full h-[46px] text-base rounded-full bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "#17191c", color: "#fff" }}
      >
        {isLoading ? "Redirecting..." : `Pay with ${gateway}`}
      </button>

      <button
        onClick={onBack}
        className="text-base bold transition-opacity hover:opacity-60 flex items-center gap-1"
        style={{ color: "#6b7280" }}
      >
        Back to shipping
      </button>
    </div>
  );
}