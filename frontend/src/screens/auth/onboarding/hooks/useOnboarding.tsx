import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setOnboardingEmail } from "@/redux/slices/authSlice";
import {
  useVerifyEmailMutation,
  useVerifyPasswordMutation,
  useRegisterMutation,
} from "@/redux/services/authApi";
import { useCreateStoreMutation } from "@/redux/services/storeApi";
import toast from "react-hot-toast";
import type { AccountFormData } from "../steps/StepAccount";
import type { DetailsFormData, StoreFormData } from "../schema/onboarding.schema";

export function useOnboarding(onNext: () => void) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [pendingEmail, setPendingEmail]   = useState("");
  const [showVerify,   setShowVerify]     = useState(false);
  const [userType,     setUserType]       = useState<"SELLER" | "BUYER">("SELLER");

  const [verifyEmail,    { isLoading: sendingEmail    }] = useVerifyEmailMutation();
  const [verifyPassword, { isLoading: settingPassword }] = useVerifyPasswordMutation();
  const [register,       { isLoading: registering     }] = useRegisterMutation();
  const [createStore,    { isLoading: creatingStore   }] = useCreateStoreMutation();

  const handleAccount = async (data: AccountFormData) => {
    try {
      await verifyEmail({ email: data.email }).unwrap();
      await verifyPassword({ email: data.email, password: data.password }).unwrap();
      dispatch(setOnboardingEmail(data.email));
      setPendingEmail(data.email);
      setShowVerify(true);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    try {
      await verifyEmail({ email: pendingEmail }).unwrap();
      toast.success("Verification email resent.");
    } catch {
      toast.error("Failed to resend. Please try again.");
    }
  };

  const handleVerified = () => {
    setShowVerify(false);
    onNext();
  };

  const handleDetails = async (data: DetailsFormData) => {
    try {
      await register({
        email: pendingEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        userType: data.userType,
      }).unwrap();
      setUserType(data.userType);
      if (data.userType === "BUYER") {
        toast.success("Account created! Welcome to Selleasi.");
        navigate("/");
        return;
      }
      onNext();
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  const handleCreateStore = async (data: StoreFormData) => {
    try {
      const result = await createStore({
        name: data.name,
        subdomain: data.subdomain,
        description: data.description,
      }).unwrap();
      toast.success("Store created! Let's start selling.");
      navigate(`/dashboard/store/${result.data._id}`);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  return {
    showVerify,
    pendingEmail,
    handleAccount,
    handleVerified,
    handleDetails,
    handleCreateStore,
    handleResend,
    isAccountLoading: sendingEmail || settingPassword,
    registering,
    creatingStore,
  };
}