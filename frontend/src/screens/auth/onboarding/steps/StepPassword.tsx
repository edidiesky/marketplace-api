import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import {
  passwordSchema,
  type PasswordFormData,
} from "../schema/onboarding.schema";

interface Props {
  onSubmit: (data: PasswordFormData) => Promise<void>;
  isLoading: boolean;
}

export default function StepPassword({ onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1
          className="text-[32px] font-semibold leading-[1.1]"
          style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
        >
          Secure your account
        </h1>
        <p
          className="text-[15px]"
          style={{ color: "var(--color-muted-stone)" }}
        >
          Create a strong password to protect your store.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Password"
          type="password"
          placeholder="Min 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Confirm password"
          type="password"
          placeholder="Repeat password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </div>

      <ul className="flex flex-col gap-1.5">
        {[
          "At least 8 characters",
          "One uppercase letter",
          "One number",
        ].map((rule) => (
          <li
            key={rule}
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--color-muted-stone)" }}
          >
            <span
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: "var(--color-hint-of-grey)" }}
            />
            {rule}
          </li>
        ))}
      </ul>

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
        {isLoading ? "Saving..." : "Continue"}
        {!isLoading && <ArrowRight size={14} />}
      </button>
    </form>
  );
}