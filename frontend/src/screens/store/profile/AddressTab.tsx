import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import toast from "react-hot-toast";

const addressSchema = z.object({
  street:     z.string().min(1, "Street is required"),
  city:       z.string().min(1, "City is required"),
  state:      z.string().min(1, "State is required"),
  country:    z.string().min(1, "Country is required"),
  postalCode: z.string().optional(),
});

type AddressForm = z.infer<typeof addressSchema>;

export default function AddressTab() {
  const form = useForm<AddressForm>({ resolver: zodResolver(addressSchema) });
  const onSubmit = async (data: AddressForm) => {
    toast.success("Address saved!");
    console.log("address (not yet persisted):", data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-lg">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-[#171717]">Street address</span>
        <input
          {...form.register("street")}
          placeholder="123 Main Street"
          className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors"
        />
        {form.formState.errors.street && (
          <span className="text-xs text-red-600">{form.formState.errors.street.message}</span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-4">
        {(["city", "state"] as const).map((field) => (
          <label key={field} className="flex flex-col gap-1.5">
            <span className="text-xs text-[#171717] capitalize">{field}</span>
            <input
              {...form.register(field)}
              className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors"
            />
            {form.formState.errors[field] && (
              <span className="text-xs text-red-600">{form.formState.errors[field]?.message}</span>
            )}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-[#171717]">Country</span>
          <input
            {...form.register("country")}
            placeholder="Nigeria"
            className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors"
          />
          {form.formState.errors.country && (
            <span className="text-xs text-red-600">{form.formState.errors.country.message}</span>
          )}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-[#171717]">Postal code (optional)</span>
          <input
            {...form.register("postalCode")}
            placeholder="100001"
            className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors"
          />
        </label>
      </div>

      <button
        type="submit"
        className="h-11 bg-[#171717] text-white text-sm hover:opacity-90 w-fit px-6"
      >
        Save address
      </button>
    </form>
  );
}