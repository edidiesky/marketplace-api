import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  setOnboardingEmail,
  setOnboardingShowVerify,
  setOnboardingPendingEmail,
  setOnboardingStep,
  resetOnboarding,
  selectOnboardingShowVerify,
  selectOnboardingPendingEmail,
} from "@/redux/slices/authSlice";
import {
  useInitiateOnboardingMutation,
  useResendVerificationMutation,
  useRegisterMutation,
  type RegisterPayload,
} from "@/redux/services/authApi";
import { useCreateStoreMutation } from "@/redux/services/storeApi";
import type { AccountFormData } from "../steps/StepAccount";
import type { DetailsFormData, StoreFormData } from "../schema/onboarding.schema";
import { showToast } from "@/components/common/Toast";

import { setCredentials } from "@/redux/slices/authSlice";


export function useOnboarding(onNext: () => void) {
  const dispatch     = useDispatch();
  const navigate     = useNavigate();

  const showVerify   = useSelector(selectOnboardingShowVerify);
  const pendingEmail = useSelector(selectOnboardingPendingEmail);

  const [initiateOnboarding, { isLoading: initiating }]  = useInitiateOnboardingMutation();
  const [resendVerification]                              = useResendVerificationMutation();
  const [register, { isLoading: registering }]            = useRegisterMutation();
  const [createStore, { isLoading: creatingStore }]       = useCreateStoreMutation();

  const handleAccount = async (data: AccountFormData) => {
    try {
      await initiateOnboarding({ email: data.email, password: data.password }).unwrap();
      dispatch(setOnboardingEmail(data.email));
      dispatch(setOnboardingPendingEmail(data.email));
      dispatch(setOnboardingShowVerify(true));
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
      await resendVerification({ email: pendingEmail }).unwrap();
      showToast("Verification email resent.", "success");
    } catch {
      showToast("Failed to resend. Please try again.", "error");
    }
  };

  const handleVerified = () => {
    dispatch(setOnboardingShowVerify(false));
    dispatch(setOnboardingStep(2));
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

    const result = await register(payload).unwrap();

    // store tokens immediately — user is now authenticated
    dispatch(setCredentials({
      user: {
        userId:           result.data.userId,
        userType:         result.data.userType,
        organizationId:   "",
        organizationType: result.data.organizationType,
        name:             `${data.firstName} ${data.lastName}`.trim(),
        roles:            [],
      },
      accessToken: result.accessToken,
    }));

    if (data.userType === "customer") {
      showToast("Account created! Welcome to Selleasi.", "success");
      navigate("/");
      dispatch(resetOnboarding());
      return;
    }

    // seller continues to step 3 — authenticated, token in Redux
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
    dispatch(resetOnboarding()); // reset AFTER navigate
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