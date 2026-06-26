import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  setCredentials,
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
import type { AccountFormData } from "../steps/StepAccount";
import type { DetailsFormData } from "../schema/onboarding.schema";
import { showToast } from "@/components/common/Toast";

export function useOnboarding(onNext: () => void) {
  const dispatch     = useDispatch();
  const navigate     = useNavigate();
  const showVerify   = useSelector(selectOnboardingShowVerify);
  const pendingEmail = useSelector(selectOnboardingPendingEmail);

  const [initiateOnboarding, { isLoading: initiating }] = useInitiateOnboardingMutation();
  const [resendVerification]                             = useResendVerificationMutation();
  const [register, { isLoading: registering }]           = useRegisterMutation();

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

      if (data.userType === "customer") {
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
        showToast("Account created! Welcome to Selleasi.", "success");
        navigate("/");
        dispatch(resetOnboarding());
        return;
      }
      dispatch(resetOnboarding());
      showToast("Account created! Please log in to continue setting up your store.", "success");
      navigate("/login", { state: { hint: "new-seller" } });
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
    handleResend,
    isAccountLoading: initiating,
    registering,
  };
}