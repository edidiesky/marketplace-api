import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setOnboardingEmail } from "@/redux/slices/authSlice";
import {
  useInitiateOnboardingMutation,
  useRegisterMutation,
  type RegisterPayload,
} from "@/redux/services/authApi";
import { useCreateStoreMutation } from "@/redux/services/storeApi"
import type { AccountFormData } from "../steps/StepAccount";
import type { DetailsFormData, StoreFormData } from "../schema/onboarding.schema";
import { showToast } from "@/components/common/Toast";

export function useOnboarding(onNext: () => void) {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();

  const [pendingEmail, setPendingEmail] = useState("");
  const [showVerify,   setShowVerify]   = useState(false);

  const [initiateOnboarding, { isLoading: initiating }] = useInitiateOnboardingMutation();
  const [register,           { isLoading: registering }] = useRegisterMutation();
  const [createStore,        { isLoading: creatingStore }] = useCreateStoreMutation();

  const handleAccount = async (data: AccountFormData) => {
    try {
      await initiateOnboarding({ email: data.email, password: data.password }).unwrap();
      dispatch(setOnboardingEmail(data.email));
      setPendingEmail(data.email);
      setShowVerify(true);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) =>
        showToast(m, "error")
      );
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    try {
      await initiateOnboarding({ email: pendingEmail, password: "" }).unwrap();
      showToast("Verification email resent.", "success");
    } catch {
      showToast("Failed to resend. Please try again.", "error");
    }
  };

  const handleVerified = () => {
    setShowVerify(false);
    onNext();
  };

  const handleDetails = async (data: DetailsFormData) => {
    try {
      const payload: RegisterPayload = {
        email:     pendingEmail,
        firstName: data.firstName,
        lastName:  data.lastName,
        userType:  data.userType,
        phone:     data.phone,
        gender:    data.gender,
      };
      await register(payload).unwrap();
      if (data.userType === "BUYER") {
        showToast("Account created! Welcome to Selleasi.", "success");
        navigate("/");
        return;
      }
      onNext();
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) =>
        showToast(m, "error")
      );
    }
  };

  const handleCreateStore = async (data: StoreFormData) => {
    try {
      const result = await createStore({
        name:        data.name,
        subdomain:   data.subdomain,
        description: data.description,
      }).unwrap();
      showToast("Store created! Let's start selling.", "success");
      navigate(`/dashboard/store/${result.data._id}`);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) =>
        showToast(m, "error")
      );
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
    isAccountLoading: initiating,
    registering,
    creatingStore,
  };
}