import { useState } from "react";
import { useSelector } from "react-redux";
import { selectOnboardingEmail } from "@/redux/slices/authSlice";
import AuthLayout from "../shared/AuthLayout";
import AuthProgress from "../shared/AuthProgress";
import StepAccount from "./steps/StepAccount";
import StepDetails from "./steps/StepDetails";
import StepCreateStore from "./steps/StepCreateStore";
import VerifyEmailInterstitial from "./steps/VerifyEmailInterstitial";
import { useOnboarding } from "./hooks/useOnboarding";

const STEP_LABELS = ["Account", "Your details", "Create store"];
const TOTAL_STEPS = 3;


const LEFT_CONTENT: Record<number, { heading: string; sub: string }> = {
  1: { heading: "Join 10,000+ sellers.",        sub: "No credit card required. Start free, scale when you're ready."          },
  2: { heading: "Tell us who you are.",          sub: "We'll personalise your dashboard based on how you use Selleasi."         },
  3: { heading: "Your store awaits.",            sub: "You're one step away from your first sale."                              },
};


export default function Onboarding() {
  const savedEmail = useSelector(selectOnboardingEmail);
  const [step, setStep] = useState(1);

  const onNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const onBack = () => setStep((s) => Math.max(s - 1, 1));

  const {
    showVerify,
    pendingEmail,
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

  const content = LEFT_CONTENT[step];

  const leftContent = (
    <div className="flex flex-col gap-6">
      <h2
        className="text-[44px] font-semibold leading-[1.1]"
        style={{ color: "var(--color-canvas)", letterSpacing: "-0.66px" }}
      >
        {content.heading}
      </h2>
      <p
        className="text-[15px] leading-relaxed max-w-xs"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {content.sub}
      </p>
      <div className="flex flex-col gap-3 mt-4">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 transition-all duration-300"
              style={{
                backgroundColor: i < step ? "var(--color-warm-mist)" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );

  return (
    <AuthLayout leftContent={leftContent}>
      <AuthProgress currentStep={step} totalSteps={TOTAL_STEPS} labels={STEP_LABELS} />

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