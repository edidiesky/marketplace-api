import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import AuthLayout from "../shared/AuthLayout";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginFormData } from "./schema/login.schema";
import { useLogin } from "./hooks/useLogin";
import { FaGoogle } from "react-icons/fa";

export default function Login() {
  const { handleLogin, isLoading } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <AuthLayout>
      <form
        onSubmit={handleSubmit(handleLogin)}
        className="flex w-[80%] flex-col gap-8"
      >
        <div className="flex flex-col gap-3">
          <h1
            className="text-[32px] font-semibold leading-[1.1]"
            style={{ color: "var(--color-ink)", letterSpacing: "-0.66px" }}
          >
            Welcome back
            <br />
            Sign in to sell.
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted-stone)" }}>
            Access your stores, review your current sales, and continue shipping
            without friction.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="w-full bg-gray-100 h-12 flex items-center justify-center gap-2 border text-base font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            <FaGoogle /> Continue with Google
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            icon={<Mail size={15} />}
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Your password"
            icon={<Lock size={15} />}
            error={errors.password?.message}
            {...register("password")}
          />
        </div>

        <div className="flex justify-end">
          <Link
            to="/reset-password"
            className="text-sm underline underline-offset-4 transition-opacity hover:opacity-60"
            style={{ color: "var(--color-muted-stone)" }}
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 flex items-center justify-center gap-2 text-base font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: "var(--color-ink)",
            color: "var(--color-canvas)",
          }}
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>

        <p
          className="text-sm text-center"
          style={{ color: "var(--color-muted-stone)" }}
        >
          Don't have an account?{" "}
          <Link
            to="/onboarding"
            className="font-medium underline underline-offset-4"
            style={{ color: "var(--color-ink)" }}
          >
            Get started
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}