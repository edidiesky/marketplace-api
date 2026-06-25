import { useDispatch, useSelector } from "react-redux";
import {
  selectOnboardingEmail,
  selectOnboardingStep,
  selectOnboardingShowVerify,
  selectOnboardingPendingEmail,
  setOnboardingStep,
} from "@/redux/slices/authSlice";
import AuthLayout from "../shared/AuthLayout";
import StepAccount from "./steps/StepAccount";
import StepDetails from "./steps/StepDetails";
import StepCreateStore from "./steps/StepCreateStore";
import VerifyEmailInterstitial from "./steps/VerifyEmailInterstitial";
import { useOnboarding } from "./hooks/useOnboarding";

const STEP_LABELS = ["Create your account", "Your details", "Create your store"];
const TOTAL_STEPS = 3;

export default function Onboarding() {
  const dispatch   = useDispatch();
  const savedEmail = useSelector(selectOnboardingEmail);
  const step       = useSelector(selectOnboardingStep);
  const showVerify = useSelector(selectOnboardingShowVerify);
  const pendingEmail = useSelector(selectOnboardingPendingEmail);

  const onNext = () => dispatch(setOnboardingStep(Math.min(step + 1, TOTAL_STEPS)));
  const onBack = () => dispatch(setOnboardingStep(Math.max(step - 1, 1)));

  const {
    handleAccount,
    handleVerified,
    handleDetails,
    handleCreateStore,
    handleResend,
    isAccountLoading,
    registering,
    creatingStore,
  } = useOnboarding(onNext);

  if (showVerify) {
    return (
      <VerifyEmailInterstitial
        email={pendingEmail}
        onResend={handleResend}
        isResending={isAccountLoading}
        onVerified={handleVerified}
      />
    );
  }

  return (
    <AuthLayout stepLabels={STEP_LABELS} currentStep={step}>
      {step === 1 && (
        <StepAccount
          onSubmit={handleAccount}
          isLoading={isAccountLoading}
          defaultEmail={savedEmail ?? ""}
        />
      )}
      {step === 2 && (
        <StepDetails
          onSubmit={handleDetails}
          isLoading={registering}
        />
      )}
      {step === 3 && (
        <StepCreateStore
          onSubmit={handleCreateStore}
          isLoading={creatingStore}
        />
      )}
      {step > 1 && (
        <button
          onClick={onBack}
          className="mt-6 text-sm transition-opacity hover:opacity-60 flex items-center gap-1"
          style={{ color: "var(--color-muted-stone)" }}
        >
          ← Back
        </button>
      )}
    </AuthLayout>
  );
}