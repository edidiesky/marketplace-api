// src/screens/auth/onboarding/steps/StepCreateStore.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { ArrowRight, Store } from "lucide-react";
import { storeSchema, type StoreFormData } from "../schema/onboarding.schema";

interface Props {
  onSubmit: (data: StoreFormData) => Promise<void>;
  isLoading: boolean;
}

export default function StepCreateStore({ onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
  });

  const name = watch("name") ?? "";

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue("name", value);
    setValue(
      "subdomain",
      value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1
          className="text-[32px] font-semibold leading-[1.1]"
          style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
        >
          Create your store
        </h1>
        <p
          className="text-[15px]"
          style={{ color: "var(--color-muted-stone)" }}
        >
          You can always change these details later.
        </p>
      </div>

      <div
        className="w-12 h-12 rounded-[12px] flex items-center justify-center"
        style={{ backgroundColor: "var(--color-warm-mist)" }}
      >
        <Store size={20} style={{ color: "var(--color-terracotta)" }} />
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Store name"
          placeholder="Kemi's Boutique"
          error={errors.name?.message}
          {...register("name")}
          onChange={handleNameChange}
        />

        <div className="flex flex-col gap-1.5">
          <Input
            label="Subdomain"
            placeholder="kemis-boutique"
            error={errors.subdomain?.message}
            {...register("subdomain")}
          />
          <p
            className="text-xs"
            style={{ color: "var(--color-muted-stone)" }}
          >
            Your store will be at{" "}
            <span
              className="font-medium"
              style={{ color: "var(--color-ink)" }}
            >
              {watch("subdomain") || "your-store"}.selleasi.com
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--color-ink)" }}
          >
            Description{" "}
            <span style={{ color: "var(--color-muted-stone)" }}>
              (optional)
            </span>
          </label>
          <textarea
            placeholder="Tell customers what you sell..."
            rows={3}
            className="w-full rounded-[10px] border px-3 py-2.5 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
            style={{
              borderColor: "var(--color-stone-surface)",
              color: "var(--color-ink)",
              backgroundColor: "var(--color-canvas)",
            }}
            {...register("description")}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{
          backgroundColor: "var(--color-ink)",
          color: "var(--color-canvas)",
          borderRadius: "9999px",
        }}
      >
        {isLoading ? "Creating store..." : "Launch my store"}
        {!isLoading && <ArrowRight size={14} />}
      </button>
    </form>
  );
}