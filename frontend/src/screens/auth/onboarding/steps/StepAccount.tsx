import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Input } from "@/components/ui/input";
const accountSchema = z.object({
  email:           z.string().email("Enter a valid email address"),
  password:        z.string().min(8, "Minimum 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type AccountFormData = z.infer<typeof accountSchema>;

interface Props {
  onSubmit: (data: AccountFormData) => Promise<void>;
  isLoading: boolean;
  defaultEmail?: string;
}

export default function StepAccount({ onSubmit, isLoading, defaultEmail }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: defaultEmail ?? "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1
          className="text-[28px] font-semibold leading-[1.1]"
          style={{ color: "var(--color-ink)", letterSpacing: "-0.5px" }}
        >
          Create your account
        </h1>
        <p className="text-[15px]" style={{ color: "var(--color-muted-stone)" }}>
          No credit card required. Start free, scale when you're ready.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
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
        {["At least 8 characters", "One uppercase letter", "One number"].map((rule) => (
          <li key={rule} className="flex items-center gap-2 text-xs" style={{ color: "var(--color-muted-stone)" }}>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-muted-stone)" }} />
            {rule}
          </li>
        ))}
      </ul>

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