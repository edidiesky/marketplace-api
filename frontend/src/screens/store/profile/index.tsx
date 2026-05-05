import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { useGetUserQuery, useUpdateUserMutation } from "@/redux/services/userApi";
import { useGetMyOrdersQuery } from "@/redux/services/orderApi";
import { useChangePasswordMutation } from "@/redux/services/authApi";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import type { Order, OrderStatus, FulfillmentStatus, UpdateUserPayload } from "@/types/api";

type Tab = "profile" | "orders" | "password" | "address";

const orderStatusConfig: Record<OrderStatus, { label: string; className: string }> = {
  payment_pending:   { label: "Pending",    className: "bg-yellow-50 text-yellow-800" },
  payment_initiated: { label: "Initiated",  className: "bg-blue-50 text-blue-700"    },
  completed:         { label: "Completed",  className: "bg-green-50 text-green-700"  },
  failed:            { label: "Failed",     className: "bg-red-50 text-red-700"      },
  out_of_stock:      { label: "Out of Stock", className: "bg-orange-50 text-orange-700" },
};

const fulfillmentConfig: Record<FulfillmentStatus, { label: string; className: string }> = {
  unfulfilled:     { label: "Unfulfilled",     className: "bg-[#f2f0ed] text-[#4c4c4c]" },
  preparing:       { label: "Preparing",       className: "bg-blue-50 text-blue-700"    },
  dispatched:      { label: "Dispatched",      className: "bg-sky-50 text-sky-700"      },
  delivered:       { label: "Delivered",       className: "bg-green-50 text-green-700"  },
  delivery_failed: { label: "Delivery Failed", className: "bg-red-50 text-red-700"      },
};

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName:  z.string().min(1, "Last name is required"),
  phone:     z.string().optional(),
  gender:    z.enum(["Male", "Female"]).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword:     z.string().min(8, "Minimum 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const addressSchema = z.object({
  street:     z.string().min(1, "Street is required"),
  city:       z.string().min(1, "City is required"),
  state:      z.string().min(1, "State is required"),
  country:    z.string().min(1, "Country is required"),
  postalCode: z.string().optional(),
});

type ProfileForm  = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type AddressForm  = z.infer<typeof addressSchema>;

const TABS: { key: Tab; label: string }[] = [
  { key: "profile",  label: "Profile"         },
  { key: "orders",   label: "My Orders"       },
  { key: "password", label: "Change Password" },
  { key: "address",  label: "Address"         },
];

const ROWS_PER_PAGE = 8;

export default function BuyerProfile() {
  const { id: storeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: userResponse } = useGetUserQuery(currentUser?._id ?? "", { skip: !currentUser?._id });
  const { data: ordersResponse, isLoading: ordersLoading } = useGetMyOrdersQuery(
    { page: currentPage, limit: ROWS_PER_PAGE },
    { skip: activeTab !== "orders" }
  );
  const [updateUser, { isLoading: updatingProfile }] = useUpdateUserMutation();
  const [changePassword, { isLoading: changingPassword }] = useChangePasswordMutation();

  const user = userResponse?.data;
  const orders: Order[] = ordersResponse?.data ?? [];
  const totalPages = ordersResponse?.pagination?.totalPages ?? 1;

  const profileForm  = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const addressForm  = useForm<AddressForm>({ resolver: zodResolver(addressSchema) });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName,
        lastName:  user.lastName,
        phone:     user.phone ?? "",
        gender:    user.gender,
      });
    }
  }, [user, profileForm]);

  const onProfileSubmit = async (data: ProfileForm) => {
    if (!currentUser?._id) return;
    try {
      const payload: UpdateUserPayload = { firstName: data.firstName, lastName: data.lastName, phone: data.phone, gender: data.gender };
      await updateUser({ id: currentUser._id, ...payload }).unwrap();
      toast.success("Profile updated!");
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }).unwrap();
      toast.success("Password changed!");
      passwordForm.reset();
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  const onAddressSubmit = async (data: AddressForm) => {
    toast.success("Address saved!");
    console.log("data", data)
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center flex flex-col gap-4">
          <p className="text-sm text-[#666]">You need to be signed in to view your profile.</p>
          <button
            onClick={() => navigate("/login")}
            className="h-10 px-6 bg-[#171717] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#fafafa]">
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12 flex flex-col gap-8">

        <div className="flex items-center gap-4">
          {user?.profileImage ? (
            <img src={user.profileImage} alt="avatar" className="w-14 h-14 object-cover" />
          ) : (
            <div className="w-14 h-14 bg-[#171717] flex items-center justify-center text-white text-xl font-bold">
              {currentUser.firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-bold text-[#171717]">{currentUser.firstName} {currentUser.lastName}</p>
            <p className="text-sm text-[#666]">{currentUser.email}</p>
          </div>
        </div>

        <div className="flex items-center border-b border-[#e8e6e3] overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-[#171717] text-[#171717]"
                  : "border-transparent text-[#777] hover:text-[#171717]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="flex flex-col gap-5 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              {(["firstName", "lastName"] as const).map((field) => (
                <label key={field} className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#171717]">
                    {field === "firstName" ? "First name" : "Last name"}
                  </span>
                  <input
                    {...profileForm.register(field)}
                    className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors"
                  />
                  {profileForm.formState.errors[field] && (
                    <span className="text-xs text-red-600">{profileForm.formState.errors[field]?.message}</span>
                  )}
                </label>
              ))}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#171717]">Phone</span>
              <input {...profileForm.register("phone")} placeholder="+234..." className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#171717]">Gender</span>
              <select {...profileForm.register("gender")} className="h-[42px] border border-black/10 px-4 text-sm bg-white outline-none focus:border-[#171717] transition-colors">
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <button type="submit" disabled={updatingProfile} className="h-11 bg-[#171717] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 w-fit px-6">
              {updatingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        )}

        {activeTab === "orders" && (
          <div className="flex flex-col gap-4">
            {ordersLoading ? (
              <p className="text-sm text-[#666]">Loading orders...</p>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 flex flex-col gap-3">
                <p className="text-sm text-[#666]">You have no orders yet.</p>
                <button onClick={() => navigate(`/store/${storeId}`)} className="text-sm underline underline-offset-4 text-[#171717]">
                  Start shopping
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {orders.map((order) => {
                    const osCfg = orderStatusConfig[order.orderStatus];
                    const fsCfg = fulfillmentConfig[order.fulfillmentStatus];
                    return (
                      <div key={order._id} className="bg-white border border-black/5 p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs text-[#aaa] font-mono">{order._id}</p>
                          <p className="text-xs text-[#666]">
                            {new Date(order.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 ${osCfg.className}`}>{osCfg.label}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 ${fsCfg.className}`}>{fsCfg.label}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#666]">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                          <p className="text-sm font-bold text-[#171717]">₦{order.totalAmount.toLocaleString("en-NG")}</p>
                        </div>
                        {order.shippingAddress && (
                          <p className="text-xs text-[#aaa]">
                            {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[#aaa]">Page {currentPage} of {totalPages}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-3 text-xs border border-black/10 disabled:opacity-40 hover:bg-[#f4f3ee]">Prev</button>
                    <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 px-3 text-xs border border-black/10 disabled:opacity-40 hover:bg-[#f4f3ee]">Next</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "password" && (
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="flex flex-col gap-5 max-w-lg">
            {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#171717]">
                  {field === "currentPassword" ? "Current password" : field === "newPassword" ? "New password" : "Confirm new password"}
                </span>
                <input type="password" {...passwordForm.register(field)} className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors" />
                {passwordForm.formState.errors[field] && (
                  <span className="text-xs text-red-600">{passwordForm.formState.errors[field]?.message}</span>
                )}
              </label>
            ))}
            <button type="submit" disabled={changingPassword} className="h-11 bg-[#171717] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 w-fit px-6">
              {changingPassword ? "Updating..." : "Change password"}
            </button>
          </form>
        )}

        {activeTab === "address" && (
          <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="flex flex-col gap-5 max-w-lg">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#171717]">Street address</span>
              <input {...addressForm.register("street")} placeholder="123 Main Street" className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors" />
              {addressForm.formState.errors.street && <span className="text-xs text-red-600">{addressForm.formState.errors.street.message}</span>}
            </label>
            <div className="grid grid-cols-2 gap-4">
              {(["city", "state"] as const).map((field) => (
                <label key={field} className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#171717] capitalize">{field}</span>
                  <input {...addressForm.register(field)} className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors" />
                  {addressForm.formState.errors[field] && <span className="text-xs text-red-600">{addressForm.formState.errors[field]?.message}</span>}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#171717]">Country</span>
                <input {...addressForm.register("country")} placeholder="Nigeria" className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors" />
                {addressForm.formState.errors.country && <span className="text-xs text-red-600">{addressForm.formState.errors.country.message}</span>}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#171717]">Postal code (optional)</span>
                <input {...addressForm.register("postalCode")} placeholder="100001" className="h-[42px] border border-black/10 px-4 text-sm outline-none focus:border-[#171717] transition-colors" />
              </label>
            </div>
            <button type="submit" className="h-11 bg-[#171717] text-white text-sm font-semibold hover:opacity-90 w-fit px-6">
              Save address
            </button>
          </form>
        )}

      </div>
    </div>
  );
}