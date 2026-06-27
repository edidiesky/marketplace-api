import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Lock, CheckCircle } from "lucide-react";
import AuthLayout from "./shared/AuthLayout";
import { Input } from "@/components/ui/input";
import { usePasswordResetMutation } from "@/redux/services/authApi";
import toast from "react-hot-toast";

const schema = z
  .object({
    password: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function NewPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [done, setDone] = React.useState(false);
  const [passwordReset, { isLoading }] = usePasswordResetMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error("Invalid or expired reset link.");
      return;
    }
    try {
      await passwordReset({ token, password: data.password }).unwrap();
      setDone(true);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) =>
        toast.error(m),
      );
    }
  };

  if (done) {
    return (
      <AuthLayout>
        <div className="flex flex-col gap-6 w-[80%]">
          <div className="flex flex-col gap-3">
            <div
              className="w-12 h-12 flex items-center justify-center"
              style={{ backgroundColor: "#dcfce7" }}
            >
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <h1
              className="text-[32px]  leading-[1.1]"
              style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
            >
              Password updated
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--color-muted-stone)" }}
            >
              Your password has been changed successfully. You can now sign in
              with your new password.
            </p>
          </div>

          <button
            onClick={() => navigate("/login")}
            className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--color-ink)",
              color: "var(--color-canvas)",
            }}
          >
            Sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (!token) {
    return (
      <AuthLayout>
        <div className="flex flex-col gap-6 w-[80%]">
          <h1
            className="text-[32px]  leading-[1.1]"
            style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
          >
            Invalid link
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted-stone)" }}>
            This password reset link is invalid or has expired.
          </p>
          <Link
            to="/reset-password"
            className="text-sm font-medium underline underline-offset-4"
            style={{ color: "var(--color-ink)" }}
          >
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-8 w-[80%]"
      >
        <div className="flex flex-col gap-3">
          <h1
            className="text-[32px]  leading-[1.1]"
            style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
          >
            Set new password
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted-stone)" }}>
            Choose a strong password to secure your account.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Input
            label="New password"
            type="password"
            placeholder="Min 8 characters"
            icon={<Lock size={15} />}
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="Confirm new password"
            type="password"
            placeholder="Repeat password"
            icon={<Lock size={15} />}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>

        <ul className="flex flex-col gap-1.5">
          {["At least 8 characters", "One uppercase letter", "One number"].map(
            (rule) => (
              <li
                key={rule}
                className="flex items-center gap-2 text-xs"
                style={{ color: "var(--color-muted-stone)" }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: "var(--color-muted-stone)" }}
                />
                {rule}
              </li>
            ),
          )}
        </ul>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: "var(--color-ink)",
            color: "var(--color-canvas)",
          }}
        >
          {isLoading ? "Updating..." : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}
