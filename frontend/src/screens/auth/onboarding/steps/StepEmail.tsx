import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail } from "lucide-react";
import { emailSchema, type EmailFormData } from "../schema/onboarding.schema";

interface Props {
  onSubmit: (data: EmailFormData) => Promise<void>;
  isLoading: boolean;
  defaultEmail?: string;
}

export default function StepEmail({ onSubmit, isLoading, defaultEmail }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: defaultEmail ?? "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1
          className="text-[32px] font-semibold leading-[1.1]"
          style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
        >
          Let's get started
        </h1>
        <p
          className="text-[15px]"
          style={{ color: "var(--color-muted-stone)" }}
        >
          Enter your email to begin. We'll send you a verification link.
        </p>
      </div>

      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        icon={<Mail size={15} />}
        error={errors.email?.message}
        {...register("email")}
      />

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
        {isLoading ? "Sending link..." : "Send verification link"}
        {!isLoading && <ArrowRight size={14} />}
      </button>

      <p
        className="text-sm text-center"
        style={{ color: "var(--color-muted-stone)" }}
      >
        Already have an account?{" "}
        <a
          href="/login"
          className="font-medium underline underline-offset-4"
          style={{ color: "var(--color-ink)" }}
        >
          Log in
        </a>
      </p>
    </form>
  );
}