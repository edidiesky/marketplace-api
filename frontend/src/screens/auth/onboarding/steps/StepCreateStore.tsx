import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { storeSchema, type StoreFormData } from "../schema/onboarding.schema";
import { useRef } from "react";
interface Props {
  onSubmit: (data: StoreFormData) => Promise<void>;
  isLoading: boolean;
}

export default function StepCreateStore({ onSubmit, isLoading }: Props) {
  const fieldsRef = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StoreFormData>({ resolver: zodResolver(storeSchema) });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue("name", value);
    setValue(
      "subdomain",
      value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    );
  };

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
        <h1
          className="text-2xl lg:text-3xl leading-[1.1]"
        >
          Create your store
        </h1>
        <p className="text-[15px] bold" style={{ color: "var(--color-muted-stone)" }}>
          You can always change these details later.
        </p>
      </div>

      <div ref={fieldsRef} className="flex flex-col gap-4">
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
          <p className="text-xs" style={{ color: "var(--color-muted-stone)" }}>
            Your store will be at{" "}
            <span className="" style={{ color: "var(--color-ink)" }}>
              {watch("subdomain") || "your-store"}.selleasi.com
            </span>
          </p>
        </div>
         <div className="flex flex-col gap-1.5">
          <Input
            label="Store email"
            placeholder="kemis-boutique"
            error={errors.name?.message}
            {...register("email")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm " style={{ color: "var(--color-ink)" }}>
            Description{" "}
          </label>
          <textarea
            placeholder="Tell customers what you sell..."
            rows={3}
            className="w-full border px-3 py-2.5 text-sm resize-none outline-none transition-colors"
            style={{
              borderColor: "var(--color-stone-surface)",
              color: "var(--color-ink)",
              backgroundColor: "var(--color-canvas)",
              borderRadius: "10px",
            }}
            {...register("description")}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 rounded-full flex items-center justify-center gap-2 text-sm  transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-canvas)" }}
      >
        {isLoading ? "Creating store..." : "Launch my store"}
      </button>
    </form>
  );
}