import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useGetUserQuery, useUpdateUserMutation } from "@/redux/services/userApi";
import type { User, UpdateUserPayload } from "@/types/api";
import toast from "react-hot-toast";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName:  z.string().min(1, "Last name is required"),
  phone:     z.string().optional(),
  gender:    z.enum(["Male", "Female"]).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface Props {
  currentUser: User;
}

export default function AccountTab({ currentUser }: Props) {
  // currentUser (JWT) never carries firstName/lastName/profileImage —
  // those only exist on the full record fetched here.
  const { data: userResponse } = useGetUserQuery(currentUser.userId, {
    skip: !currentUser.userId,
  });
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();

  const user = userResponse?.data;

  const form = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName ?? "",
        lastName:  user.lastName ?? "",
        phone:     user.phone ?? "",
        gender:    user.gender,
      });
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      const payload: UpdateUserPayload = {
        firstName: data.firstName,
        lastName:  data.lastName,
        phone:     data.phone,
        gender:    data.gender,
      };
      await updateUser({ id: currentUser.userId, ...payload }).unwrap();
      toast.success("Profile updated!");
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  const displayName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || currentUser.name
    : currentUser.name;

  return (
    <div className="flex flex-col gap-10">

      {/* About You — read-only summary, matches Etsy's "Name / Member since" block */}
      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-[#171717]">About You</h3>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[#888]">Name</span>
          <span className="text-sm text-[#171717]">{displayName}</span>
        </div>
        {user?.createdAt && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[#888]">Member since</span>
            <span className="text-sm text-[#171717]">
              {new Date(user.createdAt).toLocaleDateString("en-NG", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </section>

      {/* editable form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          {(["firstName", "lastName"] as const).map((field) => (
            <label key={field} className="flex flex-col gap-1.5">
              <span className="text-xs text-[#171717]">
                {field === "firstName" ? "First name" : "Last name"}
              </span>
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
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-[#171717]">Phone</span>
          <input
            {...form.register("phone")}
            placeholder="+234..."
            className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-[#171717]">Gender</span>
          <select
            {...form.register("gender")}
            className="h-[42px] border border-black/10 px-4 text-sm bg-white outline-none focus:border-[#171717] transition-colors"
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={updating}
          className="h-11 bg-[#171717] text-white text-sm hover:opacity-90 disabled:opacity-50 w-fit px-6"
        >
          {updating ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}