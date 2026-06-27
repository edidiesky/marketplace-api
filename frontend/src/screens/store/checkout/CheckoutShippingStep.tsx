import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { shippingSchema, type ShippingForm } from "./useCheckout";
import { useRef } from "react";

interface Props {
  onSubmit:   (data: ShippingForm) => Promise<void>;
  isLoading:  boolean;
  onBack:     () => void;
}

export default function CheckoutShippingStep({ onSubmit, isLoading, onBack }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<ShippingForm>({
    resolver: zodResolver(shippingSchema),
  });
    const fieldsRef = useRef<HTMLDivElement>(null);
  const shake = () => {
    const el = fieldsRef.current;
    if (!el) return;
    el.classList.remove("shake");
    el.getBoundingClientRect();
    el.classList.add("shake");
    el.addEventListener("animationend", () => el.classList.remove("shake"), {
      once: true,
    });
  };

  const onInvalid = () => shake();

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl lg:text-3xl" >
            Shipping Address
          </h1>
        </div>
        <h4 className="text-base" style={{ color: "#6b7280" }}>
          Where should we deliver your order?
        </h4>
      </div>

      <div ref={fieldsRef}  className="flex flex-col gap-4">
        <Input
          label="Full name"
          error={errors.fullName?.message}
          placeholder="Edidiong Essien"
          {...register("fullName")}
        />
        <Input
          label="Email address"
          type="email"
          error={errors.email?.message}
          placeholder="you@example.com"
          {...register("email")}
        />
        <Input
          label="Street address"
          error={errors.address?.message}
          placeholder="123 Main Street, Lekki Phase 1"
          {...register("address")}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="City"  error={errors.city?.message}  placeholder="Lagos"       {...register("city")}  />
          <Input label="State" error={errors.state?.message} placeholder="Lagos State" {...register("state")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Country"      error={errors.country?.message} placeholder="Nigeria"          {...register("country")} />
          <Input label="Phone number" error={errors.phone?.message}   placeholder="+234 800 000 0000" {...register("phone")}   />
        </div>
        <Input label="Postal code (optional)" placeholder="100001" {...register("postalCode")} />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-[46px] text-base rounded-full bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "#17191c", color: "#fff" }}
      >
        {isLoading ? "Processing..." : "Continue to Payment"}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="text-base bold transition-opacity hover:opacity-60 flex items-center gap-1"
        style={{ color: "#6b7280" }}
      >
        Back to cart
      </button>
    </form>
  );
}