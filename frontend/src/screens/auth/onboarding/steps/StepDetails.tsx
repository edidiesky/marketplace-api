import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { User, Briefcase } from "lucide-react";
import { detailsSchema, type DetailsFormData } from "../schema/onboarding.schema";

interface Props {
  onSubmit: (data: DetailsFormData) => Promise<void>;
  isLoading: boolean;
}

export default function StepDetails({ onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { userType: "SELLER" },
  });

  const userType = watch("userType");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1
          className="text-[28px] font-semibold leading-[1.1]"
          style={{ color: "var(--color-ink)", letterSpacing: "-0.5px" }}
        >
          Tell us about yourself
        </h1>
        <p className="text-[15px]" style={{ color: "var(--color-muted-stone)" }}>
          A few details to personalise your experience.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First name"
          placeholder="Ada"
          error={errors.firstName?.message}
          {...register("firstName")}
        />
        <Input
          label="Last name"
          placeholder="Obi"
          error={errors.lastName?.message}
          {...register("lastName")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
          I am joining as
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["SELLER", "BUYER"] as const).map((type) => {
            const Icon = type === "SELLER" ? Briefcase : User;
            const isSelected = userType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setValue("userType", type)}
                className="flex flex-col items-start gap-2 p-4 rounded-[14px] border-2 transition-all"
                style={{
                  borderColor: isSelected ? "var(--color-ink)" : "#e5e7eb",
                  backgroundColor: isSelected ? "var(--color-fog)" : "#ffffff",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: isSelected ? "var(--color-ink)" : "var(--color-fog)",
                  }}
                >
                  <Icon
                    size={15}
                    style={{
                      color: isSelected ? "var(--color-canvas)" : "var(--color-muted-stone)",
                    }}
                  />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                    {type === "SELLER" ? "Seller" : "Buyer"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-muted-stone)" }}>
                    {type === "SELLER" ? "I want to sell products" : "I want to buy products"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {errors.userType && (
          <p className="text-xs" style={{ color: "#ef4444" }}>{errors.userType.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-canvas)" }}
      >
        {isLoading ? "Creating account..." : "Continue"}
      </button>
    </form>
  );
}