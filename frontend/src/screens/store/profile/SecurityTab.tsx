import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useChangePasswordMutation } from "@/redux/services/authApi";
import toast from "react-hot-toast";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword:     z.string().min(8, "Minimum 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordForm = z.infer<typeof passwordSchema>;

const FIELD_LABELS: Record<keyof PasswordForm, string> = {
  currentPassword: "Current password",
  newPassword:     "New password",
  confirmPassword: "Confirm new password",
};

export default function SecurityTab() {
  const form = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const onSubmit = async (data: PasswordForm) => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      }).unwrap();
      toast.success("Password changed!");
      form.reset();
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-lg">
      {(Object.keys(FIELD_LABELS) as (keyof PasswordForm)[]).map((field) => (
        <label key={field} className="flex flex-col gap-1.5">
          <span className="text-xs text-[#171717]">{FIELD_LABELS[field]}</span>
          <input
            type="password"
            {...form.register(field)}
            className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors"
          />
          {form.formState.errors[field] && (
            <span className="text-xs text-red-600">{form.formState.errors[field]?.message}</span>
          )}
        </label>
      ))}
      <button
        type="submit"
        disabled={isLoading}
        className="h-11 bg-[#171717] text-white text-sm hover:opacity-90 disabled:opacity-50 w-fit px-6"
      >
        {isLoading ? "Updating..." : "Change password"}
      </button>
    </form>
  );
}