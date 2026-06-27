import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import AuthLayout from "./shared/AuthLayout";
import { Input } from "@/components/ui/input";
import { useRequestResetMutation } from "@/redux/services/authApi";
import toast from "react-hot-toast";
import React from "react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [sent, setSent] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState("");
  const [requestReset, { isLoading }] = useRequestResetMutation();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await requestReset({ email: data.email }).unwrap();
      setSubmittedEmail(data.email);
      setSent(true);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  if (sent) {
    return (
      <AuthLayout>
        <div className="flex flex-col gap-6 w-[80%]">
          <div className="flex flex-col gap-3">
            <div
              className="w-12 h-12 flex items-center justify-center"
              style={{ backgroundColor: "var(--color-warm-mist)" }}
            >
              <Mail size={20} style={{ color: "var(--color-terracotta)" }} />
            </div>
            <h1
              className="text-[32px]  leading-[1.1]"
              style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
            >
              Check your inbox
            </h1>
            <p className="text-sm" style={{ color: "var(--color-muted-stone)" }}>
              We sent a password reset link to{" "}
              <span className="" style={{ color: "var(--color-ink)" }}>
                {submittedEmail}
              </span>
              . The link expires in 15 minutes.
            </p>
          </div>

          <div
            className="p-4 flex flex-col gap-2"
            style={{ backgroundColor: "var(--color-fog)" }}
          >
            <p className="text-xs  uppercase " style={{ color: "var(--color-muted-stone)" }}>
              Didn't receive it?
            </p>
            <p className="text-sm" style={{ color: "var(--color-muted-stone)" }}>
              Check your spam folder or{" "}
              <button
                onClick={() => setSent(false)}
                className=" underline underline-offset-4 transition-opacity hover:opacity-60"
                style={{ color: "var(--color-ink)" }}
              >
                try a different email address
              </button>
              .
            </p>
          </div>

          <Link
            to="/login"
            className="text-sm transition-opacity hover:opacity-60"
            style={{ color: "var(--color-muted-stone)" }}
          >
            ← Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 w-[80%]">
        <div className="flex flex-col gap-3">
          <h1
            className="text-[32px]  leading-[1.1]"
            style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
          >
            Reset your password
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted-stone)" }}>
            Enter the email address linked to your account and we'll send you a reset link.
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
          className="w-full h-12 flex items-center justify-center gap-2 text-sm  transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-canvas)" }}
        >
          {isLoading ? "Sending..." : "Send reset link"}
        </button>

        <p className="text-sm text-center" style={{ color: "var(--color-muted-stone)" }}>
          Remember your password?{" "}
          <Link
            to="/login"
            className=" underline underline-offset-4"
            style={{ color: "var(--color-ink)" }}
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}